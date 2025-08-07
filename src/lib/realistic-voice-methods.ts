// Realistic voice enhancement methods for TTS
import ffmpeg from 'ffmpeg-static'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { TTSOptions } from './enhanced-tts'

const execAsync = promisify(exec)

export class RealisticVoiceMethods {
  constructor(private tempDir: string) {}

  // Enhanced realistic voice selection with personality mapping
  getRealisticVoiceId(voiceName: string): string {
    const realisticVoiceMap: Record<string, string> = {
      'default': 'pNInz6obpgDQGcFmaJgB', // Adam - conversational, professional
      'adam': 'pNInz6obpgDQGcFmaJgB', // Natural, engaging male voice
      'bella': 'EXAVITQu4vr4xnSDxMaL', // Warm, friendly female voice
      'charlie': 'IKne3meq5aSn9XLyUdCD', // Casual, relatable male voice
      'domi': 'AZnzlk1XvdvUeBnXmlld', // Confident, authoritative female voice
      'elli': 'MF3mGyEYCl7XYWbV9V6O', // Young, energetic female voice
      'fin': 'D38z5RcWu1voky8WS1ja', // Calm, soothing male voice
      'freya': 'jsCqWAovK2LkecY7zXl4', // Professional, clear female voice
      'giovanni': 'zcAOhNBS3c14rBihAFp1', // Expressive, dramatic male voice
      'josh': 'TxGEqnHWrfWFTfGW9XjX', // Friendly, approachable male voice
      'liam': 'TX3LPaxmHKxFdv7VOQHJ', // Deep, authoritative male voice
      'nicole': 'piTKgcLEGmPE4e6mEKli', // Smooth, professional female voice
      'rachel': '21m00Tcm4TlvDq8ikWAM', // Engaging, storytelling female voice
      'sam': 'yoZ06aMxZJJ28mfd3POQ' // Versatile, dynamic male voice
    }
    
    return realisticVoiceMap[voiceName.toLowerCase()] || realisticVoiceMap['adam']
  }

  // Enhanced script preprocessing for natural speech patterns
  enhanceScriptForRealism(script: string): string {
    console.log('🎭 Enhancing script for realism...')
    
    let enhanced = script
    
    // REMOVE STAGE DIRECTIONS AND MUSIC CUES FIRST
    enhanced = enhanced.replace(/\[INTRO\][\s\S]*?\[brief pause\]/g, '') // Remove intro sections
    enhanced = enhanced.replace(/\[SEGMENT \d+:.*?\]/g, '') // Remove segment headers
    enhanced = enhanced.replace(/\[CONCLUSION\]/g, '') // Remove conclusion markers
    enhanced = enhanced.replace(/\(Music:.*?\)/g, '') // Remove music cues
    enhanced = enhanced.replace(/\(Sound effect:.*?\)/g, '') // Remove sound effects
    enhanced = enhanced.replace(/\[.*?\]/g, '') // Remove all other stage directions
    enhanced = enhanced.replace(/\(.*?\)/g, '') // Remove parenthetical directions
    
    // Clean up extra whitespace
    enhanced = enhanced.replace(/\s+/g, ' ').trim()
    
    // Add natural speech patterns and fillers
    enhanced = enhanced.replace(/\. /g, '... ')
    enhanced = enhanced.replace(/However,/g, 'Well, actually,')
    enhanced = enhanced.replace(/Therefore,/g, 'So basically,')
    enhanced = enhanced.replace(/Furthermore,/g, 'And you know what else?')
    enhanced = enhanced.replace(/Additionally,/g, 'Plus,')
    enhanced = enhanced.replace(/In conclusion,/g, 'So to wrap this up,')
    
    // Add conversational elements
    enhanced = enhanced.replace(/It is important to note/g, 'Here\'s the thing')
    enhanced = enhanced.replace(/It should be mentioned/g, 'Oh, and by the way')
    enhanced = enhanced.replace(/This means that/g, 'What this basically means is')
    
    // Add emotional emphasis markers
    enhanced = enhanced.replace(/amazing|incredible|fantastic/gi, '<emphasis level="strong">$&</emphasis>')
    enhanced = enhanced.replace(/important|crucial|vital/gi, '<emphasis level="moderate">$&</emphasis>')
    
    console.log('✅ Script enhanced for natural speech (stage directions removed)')
    return enhanced
  }

  // Split script into natural conversation chunks
  splitEnhancedScript(script: string): string[] {
    const sentences = script.split(/[.!?]+/)
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if (sentence.trim()) {
        if (currentChunk.length + sentence.length > 500) {
          if (currentChunk) chunks.push(currentChunk.trim())
          currentChunk = sentence
        } else {
          currentChunk += (currentChunk ? '. ' : '') + sentence
        }
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim())
    return chunks
  }

  // Dynamic voice settings for different parts of the script
  getDynamicVoiceSettings(chunk: string, index: number, config: TTSOptions) {
    const isIntro = index === 0
    const isConclusion = chunk.toLowerCase().includes('conclusion') || chunk.toLowerCase().includes('wrap up')
    const isEmphatic = chunk.includes('<emphasis level="strong">')
    const isQuestion = chunk.includes('?')
    
    return {
      stability: isIntro || isConclusion ? 0.8 : (config.voiceStability || 0.6),
      similarity_boost: config.voiceSimilarity || 0.8,
      style: isEmphatic ? 0.9 : isQuestion ? 0.7 : 0.5,
      use_speaker_boost: true,
      optimize_streaming_latency: 0,
      output_format: 'mp3_44100_128'
    }
  }

  // Generate natural pauses between sections
  generateNaturalPause(previousChunk: string): Buffer {
    // Create a small silence buffer (0.5-1.5 seconds based on context)
    const pauseDuration = previousChunk.includes('!') ? 1500 : 800 // ms
    const sampleRate = 44100
    const silenceSamples = Math.floor(sampleRate * (pauseDuration / 1000))
    
    // Create a buffer filled with zeros (silence)
    const silenceBuffer = Buffer.alloc(silenceSamples * 2) // 16-bit audio = 2 bytes per sample
    return silenceBuffer
  }

  // Enhanced audio processing for realism
  async enhanceAudioForRealism(audioBuffer: Buffer<ArrayBufferLike>, config: TTSOptions): Promise<Buffer<ArrayBufferLike>> {
    if (!ffmpeg) return audioBuffer
    
    const inputFile = path.join(this.tempDir, `temp-input-${Date.now()}.mp3`)
    const outputFile = path.join(this.tempDir, `temp-output-${Date.now()}.mp3`)
    
    try {
      fs.writeFileSync(inputFile, audioBuffer)
      
      // Advanced audio enhancement for realism
      const filters = [
        'volume=1.1', // Slight volume boost
        'highpass=f=80', // Remove low-frequency noise
        'lowpass=f=8000', // Natural voice frequency range
        'dynaudnorm=p=0.9:s=5', // Dynamic range normalization
        'acompressor=threshold=0.089:ratio=9:attack=200:release=1000', // Gentle compression
        'equalizer=f=2000:width_type=h:width=200:g=2', // Enhance clarity
        'aresample=44100' // Ensure consistent sample rate
      ]
      
      const command = `"${ffmpeg}" -i "${inputFile}" -af "${filters.join(',')}" -y "${outputFile}"`
      
      await execAsync(command)
      
      const enhancedBuffer = fs.readFileSync(outputFile) as Buffer<ArrayBufferLike>
      
      // Cleanup
      fs.unlinkSync(inputFile)
      fs.unlinkSync(outputFile)
      
      console.log('✅ Audio enhanced for realism')
      return enhancedBuffer
      
    } catch (error) {
      console.error('Audio enhancement failed:', error)
      // Cleanup on error
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile)
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
      return audioBuffer
    }
  }
}