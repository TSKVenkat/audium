// Removed AWS Polly - only using ElevenLabs and Azure
// Using dynamic import for ElevenLabs to avoid build issues
// import { ElevenLabsApi, ElevenLabsVoiceId } from 'elevenlabs'
import fs from 'fs'
import path from 'path'
import ffmpeg from 'ffmpeg-static'
import { exec } from 'child_process'
import { promisify } from 'util'
import { RealisticVoiceMethods } from './realistic-voice-methods'

const execAsync = promisify(exec)

export interface TTSOptions {
  voice?: string
  speed?: number
  pitch?: number
  volume?: number
  provider?: 'elevenlabs' | 'aws-polly' | 'google-cloud' | 'azure' | 'system' | string
  voiceStability?: number
  voiceSimilarity?: number
  style?: string
  emotion?: string
  language?: string
  enhanceAudio?: boolean
  addMusic?: boolean
  musicVolume?: number
}

export interface TTSResult {
  success: boolean
  audioUrl?: string
  duration?: number
  format: string
  size?: number
  provider: string
  voice: string
  enhancedAudio?: boolean
  error?: string
  metadata: {
    generatedAt: string
    processingTime: number
    chunks?: number
    audioQuality: 'standard' | 'high' | 'premium'
    realistic?: boolean
    voiceModulation?: boolean
    fallbackUsed?: boolean
    originalProvider?: string
    fallbackReason?: string
    requiresClientSide?: boolean
    allProvidersFailed?: boolean
  }
}

export class EnhancedTTSEngine {
  private elevenlabs?: any // ElevenLabs instance
  private tempDir: string
  private realisticVoice: RealisticVoiceMethods

  constructor() {
    this.tempDir = path.join(process.cwd(), 'public', 'temp')
    this.realisticVoice = new RealisticVoiceMethods(this.tempDir)
    this.ensureTempDir()
    this.initializeProviders() // This is now async but we'll handle it
  }

  private ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  private async initializeProviders() {
    console.log('🔧 Initializing TTS providers...')
    
    // Initialize ElevenLabs with direct fetch implementation
    const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenlabsKey) {
      try {
        
        this.elevenlabs = {
          apiKey: elevenlabsKey,
          async generate(options: any) {
            const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + options.voice, {
              method: 'POST',
              headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey
              },
              body: JSON.stringify({
                text: options.text,
                model_id: options.model_id || 'eleven_multilingual_v2',
                voice_settings: options.voice_settings
              })
            })
            
            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
            }
            
            return {
              arrayBuffer: () => response.arrayBuffer()
            }
          }
        }
        console.log('✅ ElevenLabs initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize ElevenLabs:', error)
      }
    }

    // Initialize Azure TTS from environment variables
    const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
    const azureSpeechRegion = process.env.AZURE_SPEECH_REGION || 'southeastasia';
    
    if (azureSpeechKey && azureSpeechRegion) {
      console.log('🎯 Azure TTS configured as PRIMARY provider')
      console.log(`🌏 Azure region: ${azureSpeechRegion} (Southeast Asia)`)
    } else {
      console.warn('⚠️ Azure TTS not configured - AZURE_SPEECH_KEY or AZURE_SPEECH_REGION missing')
    }
  }

  async generateAudio(script: string, options: TTSOptions = {}): Promise<TTSResult> {
    const startTime = Date.now()
    console.log(`🎙️ TTS Generation Request - Voice: ${options.voice}, Provider: ${options.provider}`)
    
    const config = {
      voice: options.voice || 'adam', // Default to adam instead of 'default'
      speed: options.speed || 1.0,
      pitch: options.pitch || 1.0,
      volume: options.volume || 1.0,
      provider: options.provider || 'azure', // Default to Azure for consistency
      voiceStability: options.voiceStability || 0.5,
      voiceSimilarity: options.voiceSimilarity || 0.75,
      style: options.style || 'conversational',
      emotion: options.emotion || 'neutral',
      language: options.language || 'en-US',
      enhanceAudio: options.enhanceAudio || true,
      addMusic: options.addMusic || false,
      musicVolume: options.musicVolume || 0.3,
      ...options
    }

    // Process script for realistic speech
    const processedScript = this.realisticVoice.enhanceScriptForRealism(script)
    const chunks = this.splitScript(processedScript, 4000)
    
    // Try providers in fallback order with smart voice mapping
    const providers = this.getProviderFallbackOrder(config.provider)
    console.log('🔄 Trying TTS providers in order:', providers)

    let lastError: Error | null = null

    for (const provider of providers) {
      if (!this.isProviderAvailable(provider)) {
        console.log(`⏭️ Skipping ${provider} - not available`)
        continue
      }
      
      try {
        console.log(`🎙️ Attempting TTS with ${provider}...`)
        
        // Map voice to provider-specific voice if needed
        const mappedConfig = this.mapVoiceForProvider(config, provider)
        
        const result = await this.generateWithProvider(processedScript, chunks, provider, mappedConfig)
        
        if (result.success) {
          const processingTime = Date.now() - startTime
          const fallbackUsed = provider !== (config.provider === 'auto' ? 'elevenlabs' : config.provider)
          
          console.log(`✅ TTS generation successful with ${provider}${fallbackUsed ? ' (fallback)' : ''}`)
          
          return {
            ...result,
            metadata: {
              ...result.metadata,
              processingTime,
              chunks: chunks.length,
              fallbackUsed: fallbackUsed,
              originalProvider: config.provider === 'auto' ? 'elevenlabs' : config.provider
            }
          }
        }
      } catch (error) {
        lastError = error as Error
        console.warn(`❌ ${provider} failed:`, error instanceof Error ? error.message : error)
        
        // Special handling for quota errors
        if (error instanceof Error && (
          error.message.includes('quota_exceeded') || 
          error.message.includes('insufficient credits') ||
          error.message.includes('401')
        )) {
          console.log('💳 ElevenLabs quota/auth issue detected, trying fallback providers...')
        }
      }
    }

    return {
      success: false,
      format: 'none',
      provider: 'none',
      voice: config.voice,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        audioQuality: 'standard'
      },
      error: lastError?.message || 'All TTS providers failed'
    }
  }

  private async generateWithProvider(
    script: string, 
    chunks: string[], 
    provider: string, 
    config: TTSOptions
  ): Promise<TTSResult> {
    switch (provider) {
      case 'elevenlabs':
        return this.generateWithElevenLabs(script, chunks, config)
      case 'azure':
        return this.generateWithAzure(script, chunks, config)
      default:
        throw new Error(`Unsupported TTS provider: ${provider}. Only 'elevenlabs' and 'azure' are supported.`)
    }
  }

  private async generateWithElevenLabs(
    script: string, 
    chunks: string[], 
    config: TTSOptions
  ): Promise<TTSResult> {
    if (!this.elevenlabs) throw new Error('ElevenLabs not configured')

    console.log('🎙️ Generating with ElevenLabs for realistic voice...')
    
    // Enhanced realistic script preprocessing for natural speech
    const enhancedScript = this.realisticVoice.enhanceScriptForRealism(script)
    const enhancedChunks = this.realisticVoice.splitEnhancedScript(enhancedScript)
    
    const voiceId = this.realisticVoice.getRealisticVoiceId(config.voice!)
    const audioBuffers: Buffer[] = []

    for (let i = 0; i < enhancedChunks.length; i++) {
      const chunk = enhancedChunks[i]
      console.log(`🔄 Processing chunk ${i + 1}/${enhancedChunks.length}...`)
      
      try {
        // Dynamic voice settings for realism
        const dynamicSettings = this.realisticVoice.getDynamicVoiceSettings(chunk, i, config)
        
        const audio = await this.elevenlabs.generate({
          voice: voiceId,
          text: chunk,
          model_id: 'eleven_multilingual_v2', // Better model for realism
          voice_settings: dynamicSettings
        })

        const audioBuffer = Buffer.from(await audio.arrayBuffer())
        audioBuffers.push(audioBuffer)
        
        // Add natural pauses between sections
        if (i < enhancedChunks.length - 1) {
          const pauseBuffer = this.realisticVoice.generateNaturalPause(chunk)
          audioBuffers.push(pauseBuffer)
        }
        
      } catch (error) {
        console.error(`❌ ElevenLabs chunk ${i + 1} generation failed:`, error)
        throw error
      }
    }

    // Combine audio chunks with natural transitions
    const combinedBuffer = Buffer.concat(audioBuffers)
    const fileName = `podcast-realistic-${Date.now()}.mp3`
    const filePath = path.join(this.tempDir, fileName)

    // Apply advanced audio enhancements for realism
    let finalBuffer: Buffer<ArrayBufferLike> = combinedBuffer
    if (config.enhanceAudio) {
      finalBuffer = await this.realisticVoice.enhanceAudioForRealism(combinedBuffer, config)
    }

    fs.writeFileSync(filePath, finalBuffer)

    console.log('✅ Realistic voice generation completed!')
    
    return {
      success: true,
      audioUrl: `/temp/${fileName}`,
      duration: this.estimateAudioDuration(enhancedScript),
      format: 'mp3',
      size: finalBuffer.length,
      provider: 'elevenlabs',
      voice: config.voice!,
      enhancedAudio: config.enhanceAudio,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: 0,
        audioQuality: 'premium',
        realistic: true,
        voiceModulation: true
      }
    }
  }



  private async generateWithGoogleCloud(
    script: string, 
    chunks: string[], 
    config: TTSOptions
  ): Promise<TTSResult> {
    try {
      const textToSpeech = await import('@google-cloud/text-to-speech')
      const client = new textToSpeech.TextToSpeechClient()

      const audioBuffers: Buffer[] = []

      for (const chunk of chunks) {
        const request = {
          input: { text: chunk },
          voice: { 
            languageCode: config.language!,
            ssmlGender: 'NEUTRAL' as 'MALE' | 'FEMALE' | 'NEUTRAL'
          },
          audioConfig: { 
            audioEncoding: 'MP3' as 'MP3',
            speakingRate: config.speed!,
            pitch: config.pitch! * 2 - 2 // Convert to Google's range (-20 to 20)
          },
        }

        const [response] = await client.synthesizeSpeech(request)
        if (response.audioContent) {
          audioBuffers.push(Buffer.from(response.audioContent))
        }
      }

      const combinedBuffer = Buffer.concat(audioBuffers)
      const fileName = `podcast-google-${Date.now()}.mp3`
      const filePath = path.join(this.tempDir, fileName)

      let finalBuffer: Buffer<ArrayBufferLike> = combinedBuffer
      if (config.enhanceAudio) {
        finalBuffer = await this.enhanceAudio(combinedBuffer, config)
      }

      fs.writeFileSync(filePath, finalBuffer)

      return {
        success: true,
        audioUrl: `/temp/${fileName}`,
        duration: this.estimateAudioDuration(script),
        format: 'mp3',
        size: finalBuffer.length,
        provider: 'google-cloud',
        voice: config.voice!,
        enhancedAudio: config.enhanceAudio,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: 0,
          audioQuality: 'high'
        }
      }

    } catch (error) {
      console.error('Google Cloud TTS failed:', error)
      throw error
    }
  }

  private async generateWithAzure(script: string, chunks: string[], config: TTSOptions): Promise<TTSResult> {
    console.log('☁️ Generating with Azure TTS...')
    
    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'southeastasia';
    
    console.log(`🔑 Using Azure key: ${azureKey?.substring(0, 10)}...`)
    console.log(`🌏 Using Azure region: ${azureRegion}`)
    
    if (!azureKey) {
      throw new Error('AZURE_SPEECH_KEY environment variable is required')
    }
    
    try {
      // Azure TTS implementation using REST API
      const audioBuffers: Buffer[] = []
      
      for (const chunk of chunks) {
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${config.voice}">${chunk}</voice></speak>`
        
        const response = await fetch(
          `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': azureKey,
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
            },
            body: ssml
          }
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Azure TTS API error: ${response.status} - ${errorText}`)
        }
        
        const audioBuffer = Buffer.from(await response.arrayBuffer())
        audioBuffers.push(audioBuffer)
      }
      
      // Combine audio chunks
      const combinedBuffer = Buffer.concat(audioBuffers)
      const fileName = `podcast-azure-${Date.now()}.mp3`
      const filePath = path.join(this.tempDir, fileName)
      
      // Apply audio enhancements if requested
      let finalBuffer: Buffer<ArrayBufferLike> = combinedBuffer
      if (config.enhanceAudio) {
        finalBuffer = await this.realisticVoice.enhanceAudioForRealism(combinedBuffer, config)
      }
      
      fs.writeFileSync(filePath, finalBuffer)
      
      console.log('✅ Azure TTS generation completed!')
      
      return {
        success: true,
        audioUrl: `/temp/${fileName}`,
        duration: this.estimateAudioDuration(script),
        format: 'mp3',
        size: finalBuffer.length,
        provider: 'azure',
        voice: config.voice || 'default',
        enhancedAudio: config.enhanceAudio,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - Date.now(),
          audioQuality: 'premium',
          realistic: true,
          voiceModulation: true
        }
      }
      
    } catch (error) {
      console.error('❌ Azure TTS generation failed:', error)
      throw error
    }
  }



  private async enhanceAudio(audioBuffer: Buffer, config: TTSOptions): Promise<Buffer> {
    if (!ffmpeg) {
      console.warn('FFmpeg not available, skipping audio enhancement')
      return audioBuffer
    }

    try {
      const inputFile = path.join(this.tempDir, `temp-input-${Date.now()}.mp3`)
      const outputFile = path.join(this.tempDir, `temp-output-${Date.now()}.mp3`)

      // Write input buffer to file
      fs.writeFileSync(inputFile, audioBuffer)

      // Build FFmpeg command for audio enhancement
      const filters = []
      
      // Normalize audio levels
      filters.push('loudnorm=I=-16:LRA=11:TP=-1.5')
      
      // Add subtle reverb for warmth
      filters.push('aecho=0.8:0.88:60:0.4')
      
      // Enhance voice clarity
      filters.push('highpass=f=80,lowpass=f=8000')
      
      // Compress dynamic range slightly
      filters.push('acompressor=threshold=0.089:ratio=9:attack=200:release=1000')

      if (config.addMusic) {
        // This would add background music
        filters.push('volume=1.0')
      }

      const filterChain = filters.join(',')
      
      const command = `"${ffmpeg}" -i "${inputFile}" -af "${filterChain}" -c:a libmp3lame -b:a 192k "${outputFile}"`
      
      await execAsync(command)

      const enhancedBuffer = fs.readFileSync(outputFile)

      // Clean up temp files
      fs.unlinkSync(inputFile)
      fs.unlinkSync(outputFile)

      return enhancedBuffer

    } catch (error) {
      console.error('Audio enhancement failed:', error)
      return audioBuffer // Return original if enhancement fails
    }
  }

  private splitScript(script: string, maxChunkLength: number = 4000): string[] {
    // Split script intelligently at sentence boundaries
    const sentences = script.match(/[^\.!?]+[\.!?]+/g) || [script]
    const chunks: string[] = []
    let currentChunk = ''

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkLength && currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += ' ' + sentence
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks.length > 0 ? chunks : [script]
  }

  private estimateAudioDuration(script: string): number {
    // Average speaking rate: 150 words per minute
    const wordCount = script.split(/\s+/).length
    return Math.ceil((wordCount / 150) * 60) // Return seconds
  }

  private isProviderAvailable(provider: string): boolean {
    switch (provider) {
      case 'elevenlabs': return !!this.elevenlabs
      case 'azure': {
        const hasKey = process.env.AZURE_SPEECH_KEY;
        const hasRegion = process.env.AZURE_SPEECH_REGION;
        console.log(`🔍 Azure availability check: key=${!!hasKey}, region=${!!hasRegion}`)
        return !!hasKey && !!hasRegion
      }
      default: return false
    }
  }





  // Get provider fallback order - Azure primary, ElevenLabs fallback
  private getProviderFallbackOrder(preferredProvider: string): string[] {
    const availableProviders = ['azure', 'elevenlabs'] // Azure first now!
    
    if (preferredProvider === 'auto') {
      // Default order: Azure first, then ElevenLabs
      return availableProviders
    } else if (availableProviders.includes(preferredProvider)) {
      // Put preferred provider first, then the other
      const others = availableProviders.filter(p => p !== preferredProvider)
      return [preferredProvider, ...others]
    } else {
      // If unsupported provider requested, use default order
      return availableProviders
    }
  }

  // Map voice selection between ElevenLabs and Azure
  private mapVoiceForProvider(config: TTSOptions, provider: string): TTSOptions {
    const mappedConfig = { ...config }
    
    // 🎙️ UPDATED AZURE VOICE MAPPING - Distinct Voices
    const voiceMapping = {
      'adam': { azure: 'en-US-DavisNeural', elevenlabs: 'pNInz6obpgDQGcFmaJgB' },
      'bella': { azure: 'en-US-JennyNeural', elevenlabs: 'EXAVITQu4vr4xnSDxMaL' },
      'charlie': { azure: 'en-US-ChristopherNeural', elevenlabs: 'IKne3meq5aSn9XLyUdCD' },
      'domi': { azure: 'en-US-AriaNeural', elevenlabs: 'AZnzlk1XvdvUeBnXmlld' },
      'elli': { azure: 'en-US-SaraNeural', elevenlabs: 'MF3mGyEYCl7XYWbV9V6O' },
      'fin': { azure: 'en-US-GuyNeural', elevenlabs: 'D38z5RcWu1voky8WS1ja' },
      'freya': { azure: 'en-US-AmberNeural', elevenlabs: 'jsCqWAovK2LkecY7zXl4' },
      'giovanni': { azure: 'en-US-TonyNeural', elevenlabs: 'zcAOhNBS3c14rBihAFp1' },
      'josh': { azure: 'en-US-BrandonNeural', elevenlabs: 'TxGEqnHWrfWFTfGW9XjX' },
      'liam': { azure: 'en-GB-RyanNeural', elevenlabs: 'TX3LPaxmHKxFdv7VOQHJ' },
      'nicole': { azure: 'en-US-MonicaNeural', elevenlabs: 'piTKgcLEGmPE4e6mEKli' },
      'rachel': { azure: 'en-US-AvaNeural', elevenlabs: '21m00Tcm4TlvDq8ikWAM' },
      'sam': { azure: 'en-US-JasonNeural', elevenlabs: 'yoZ06aMxZJJ28mfd3POQ' }
    }
    
    console.log(`🔍 Looking for voice mapping for: ${config.voice} to ${provider}`)
    console.log(`📋 Available mappings:`, Object.keys(voiceMapping))
    
    const voiceMap = voiceMapping[config.voice as keyof typeof voiceMapping]
    if (voiceMap && provider === 'azure' && voiceMap.azure) {
      mappedConfig.voice = voiceMap.azure
      console.log(`✅ Voice mapping SUCCESS: ${config.voice} → ${mappedConfig.voice} (Azure)`)
    } else if (provider === 'elevenlabs') {
      // Keep original ElevenLabs voice
      console.log(`✅ Voice mapping: ${config.voice} (ElevenLabs - no mapping needed)`)
    } else if (provider === 'azure') {
      // Fallback to default Azure voice if no mapping found
      mappedConfig.voice = 'en-US-DavisNeural'
      console.log(`⚠️ No mapping found for ${config.voice}, using default: ${mappedConfig.voice} (Azure)`)
    }
    
    return mappedConfig
  }

  // Get available voices for a provider
  async getAvailableVoices(provider: string): Promise<any[]> {
    try {
      switch (provider) {
      case 'elevenlabs':
        if (!this.elevenlabs) return []
        // Would fetch ElevenLabs voices via API
        return []
        
      case 'azure':
        if (!this.isProviderAvailable('azure')) return []
        // Would fetch Azure voices via API
        return []
        
        default:
          return []
      }
    } catch (error) {
      console.error(`Failed to get voices for ${provider}:`, error)
      return []
    }
  }



  // Get list of available providers
  getAvailableProviders(): string[] {
    const providers: string[] = []
    if (this.isProviderAvailable('elevenlabs')) providers.push('elevenlabs')
    if (this.isProviderAvailable('azure')) providers.push('azure')
    return providers
  }
}