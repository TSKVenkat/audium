import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { CohereClient } from 'cohere-ai'

export interface GenerationOptions {
  style?: 'conversational' | 'professional' | 'educational' | 'entertaining'
  duration?: 'short' | 'medium' | 'long' | 'custom'
  audience?: 'general' | 'expert' | 'beginners' | 'children'
  tone?: 'friendly' | 'formal' | 'humorous' | 'dramatic'
  customDuration?: number
  includeMusic?: boolean
  voiceStyle?: string
}

export interface GenerationResult {
  success: boolean
  script: string
  metadata: {
    wordCount: number
    estimatedDuration: string
    provider: string
    style: string
    audience: string
    generatedAt: string
  }
  sections?: Array<{
    type: string
    content: string
    timestamp?: string
  }>
  error?: string
}

export class EnhancedAIGenerator {
  private gemini?: GoogleGenerativeAI
  private openai?: OpenAI
  private anthropic?: Anthropic
  private cohere?: CohereClient

  constructor() {
    // 🔒 SECURITY: Use environment variables only
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (geminiKey) {
      try {
        this.gemini = new GoogleGenerativeAI(geminiKey)
        console.log('✅ Gemini AI initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI provider:', (error as Error)?.message)
      }
    } else {
      console.error('❌ GEMINI_API_KEY environment variable is required')
    }
    
    // 🔒 SECURITY: All API keys from environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        this.openai = new OpenAI({ apiKey: openaiKey })
        console.log('✅ OpenAI initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI provider:', (error as Error)?.message)
      }
    }
    
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        this.anthropic = new Anthropic({ apiKey: anthropicKey })
        console.log('✅ Anthropic initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize Anthropic provider:', (error as Error)?.message)
      }
    }
    
    const cohereKey = process.env.COHERE_API_KEY;
    if (cohereKey) {
      try {
        this.cohere = new CohereClient({ token: cohereKey })
        console.log('✅ Cohere initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize Cohere provider:', (error as Error)?.message)
      }
    }
    
    console.log('=== INITIALIZATION COMPLETE ===')
    console.log('Available providers:', this.getAvailableProviders())
  }

  async generatePodcastScript(content: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const config = {
      style: options.style || 'conversational',
      duration: options.duration || 'medium',
      audience: options.audience || 'general',
      tone: options.tone || 'friendly',
      ...options
    }

    // Try providers in order of preference - Gemini first as primary/fallback
    const providers = [
      { name: 'gemini', method: () => this.generateWithGemini(content, config) },
      { name: 'openai', method: () => this.generateWithOpenAI(content, config) },
      { name: 'anthropic', method: () => this.generateWithAnthropic(content, config) },
      { name: 'cohere', method: () => this.generateWithCohere(content, config) }
    ]

    let lastError: Error | null = null

    for (const provider of providers) {
      try {
        if (this.isProviderAvailable(provider.name)) {
          console.log(`Trying AI provider: ${provider.name}`)
          const result = await provider.method()
          if (result.success) {
            console.log(`Successfully generated script with ${provider.name}`)
            return result
          }
        } else {
          console.log(`Provider ${provider.name} not available - missing API key`)
        }
      } catch (error) {
        console.error(`${provider.name} generation failed:`, error)
        lastError = error as Error
      }
    }

    // All AI providers failed - return proper error
    console.log('❌ All AI providers failed, no fallback available')
    return {
      success: false,
      script: '',
      metadata: {
        wordCount: 0,
        estimatedDuration: '0 minutes',
        provider: 'none',
        style: config.style,
        audience: config.audience,
        generatedAt: new Date().toISOString()
      },
      sections: [],
      error: `Service unavailable: All AI providers failed. ${lastError?.message || 'Please try again later.'}`
    }
  }

  private async generateWithAnthropic(content: string, options: GenerationOptions): Promise<GenerationResult> {
    if (!this.anthropic) throw new Error('Anthropic not initialized')

    const prompt = this.buildAdvancedPrompt(content, options)
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    })

    const script = response.content[0].type === 'text' ? response.content[0].text : ''
    
    return this.processGeneratedScript(script, 'anthropic', options)
  }

  private async generateWithOpenAI(content: string, options: GenerationOptions): Promise<GenerationResult> {
    if (!this.openai) throw new Error('OpenAI not initialized')

    console.log('🤖 OpenAI: Starting generation process...')
    const prompt = this.buildAdvancedPrompt(content, options)
    console.log('📝 OpenAI: Built prompt, length:', prompt.length)
    
    try {
      console.log('🔄 OpenAI: Sending generation request...')
    const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // More cost-effective than GPT-4
      messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000, // Reduced for cost efficiency
      temperature: 0.7
    })

    const script = response.choices[0]?.message?.content || ''
      console.log('✅ OpenAI: Generation completed successfully!')
      console.log('📊 Script length:', script.length, 'characters')
    
    return this.processGeneratedScript(script, 'openai', options)
    } catch (error) {
      console.error('❌ OpenAI generation failed:', error)
      throw error
    }
  }

  private async generateWithGemini(content: string, options: GenerationOptions): Promise<GenerationResult> {
    if (!this.gemini) {
      throw new Error('Gemini not initialized - GEMINI_API_KEY environment variable required')
    }

    console.log('🚀 Gemini: Starting generation process...')
    
    const model = this.gemini.getGenerativeModel({ 
      model: 'gemini-1.5-flash', // Higher rate limits than Pro
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 3000, // Reduced to stay within limits
      },
    })

    const prompt = this.buildAdvancedPrompt(content, options)
    console.log('📝 Gemini: Built prompt, length:', prompt.length)
    console.log('🔄 Gemini: Sending generation request...')
    
    try {
      console.log('🚀 Gemini Flash: Starting generation with reduced token usage...')
      const result = await model.generateContent(prompt)
      const response = await result.response
      const script = response.text()
      console.log('✅ Gemini: Generation completed successfully!')
      console.log('📊 Script length:', script.length, 'characters')
      console.log('📝 Script preview:', script.substring(0, 200) + '...')

      return this.processGeneratedScript(script, 'gemini', options)
    } catch (error) {
      console.error('❌ Gemini generation failed:', error)
      throw error
    }
  }

  private async generateWithCohere(content: string, options: GenerationOptions): Promise<GenerationResult> {
    if (!this.cohere) throw new Error('Cohere not initialized')

    const prompt = this.buildAdvancedPrompt(content, options)
    
    const response = await this.cohere.generate({
      model: 'command',
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
      p: 0.95
    })

    const script = response.generations[0]?.text || ''
    
    return this.processGeneratedScript(script, 'cohere', options)
  }

  private buildAdvancedPrompt(content: string, options: GenerationOptions): string {
    const durationMap = {
      short: '5-8 minutes (750-1200 words)',
      medium: '12-18 minutes (1800-2700 words)', 
      long: '25-35 minutes (3750-5250 words)',
      custom: `${options.customDuration || 15} minutes (${(options.customDuration || 15) * 150} words approximately)`
    }

    const stylePrompts = {
      conversational: 'Create a warm, engaging conversation as if talking to a close friend over coffee. Use "you", "we", natural pauses, and relatable examples.',
      professional: 'Maintain a polished, authoritative tone suitable for business or academic audiences. Clear structure, expert insights, professional language.',
      educational: 'Focus on teaching and explanation. Break down complex concepts, use analogies, include "why this matters" moments.',
      entertaining: 'Prioritize engagement and entertainment. Use storytelling, humor where appropriate, dramatic moments, and cliffhangers.'
    }

    const audiencePrompts = {
      general: 'Write for a curious general audience with varied backgrounds. Explain technical terms, use accessible language.',
      expert: 'Write for knowledgeable professionals. Use industry terminology, dive deep into technical details, focus on insights.',
      beginners: 'Write for newcomers to the topic. Start with basics, build knowledge progressively, use simple analogies.',
      children: 'Write for young audiences. Use simple language, exciting examples, interactive questions, educational games.'
    }

    const tonePrompts = {
      friendly: 'Warm, welcoming, encouraging. Use inclusive language and positive energy.',
      formal: 'Professional, respectful, structured. Maintain appropriate distance while being engaging.',
      humorous: 'Light, fun, with appropriate humor. Make people smile while learning.',
      dramatic: 'Build tension, use cliffhangers, create emotional moments and revelations.'
    }

    return `You are an expert podcast scriptwriter creating exceptional audio content. Transform the following content into a compelling ${options.duration} podcast script.

CONTENT TO TRANSFORM:
${content}

REQUIREMENTS:
- Style: ${stylePrompts[options.style!]}
- Target Duration: ${durationMap[options.duration!]}
- Audience: ${audiencePrompts[options.audience!]}
- Tone: ${tonePrompts[options.tone!]}

SCRIPT STRUCTURE:
[INTRO] (1-2 minutes)
- Compelling hook that creates immediate interest
- Brief teaser of what's coming
- Personal connection to the topic
- Set expectations for the journey

[MAIN CONTENT] (Split into 3-4 segments)
- Segment 1: Foundation & Context
- Segment 2: Core Insights & Examples  
- Segment 3: Implications & Applications
- Segment 4: Future/Deeper Dive (for longer content)

[CONCLUSION] (1-2 minutes)
- Powerful summary with key takeaways
- Call to action or reflection question
- Memorable closing thought

ENHANCED SCRIPT FEATURES:
✓ Include natural vocal cues: [pause], [emphasis], [speaking faster], [thoughtful tone]
✓ Add transition phrases: "But here's where it gets interesting...", "Now, you might be wondering..."
✓ Include rhetorical questions to engage listeners
✓ Use the "rule of three" for memorable points
✓ Add personal touches and relatable analogies
✓ Include "golden moments" - quotable insights
✓ Build emotional connection throughout

AUDIO PRODUCTION NOTES:
- Mark sections with [INTRO], [SEGMENT 1], etc.
- Include [MUSIC FADE IN/OUT] suggestions if appropriate
- Add [SOUND EFFECT] recommendations where they enhance the story
- Note any [VOICE EMPHASIS] or [PACE CHANGE] requirements

Write the complete script now, ensuring it flows naturally when spoken aloud and creates an engaging audio experience that listeners will remember and share.`
  }

  private processGeneratedScript(script: string, provider: string, options: GenerationOptions): GenerationResult {
    if (!script || script.trim().length < 100) {
      return {
        success: false,
        script: '',
        metadata: {
          wordCount: 0,
          estimatedDuration: '0 minutes',
          provider,
          style: options.style || 'conversational',
          audience: options.audience || 'general',
          generatedAt: new Date().toISOString()
        },
        error: 'Generated script was too short or empty'
      }
    }

    // Enhanced script processing
    const cleanScript = this.enhanceScript(script)
    const wordCount = cleanScript.split(/\s+/).length
    const estimatedDuration = Math.ceil(wordCount / 150) // 150 words per minute average

    // Extract sections from the script
    const sections = this.extractSections(cleanScript)

    return {
      success: true,
      script: cleanScript,
      metadata: {
        wordCount,
        estimatedDuration: `${estimatedDuration} minutes`,
        provider,
        style: options.style || 'conversational',
        audience: options.audience || 'general',
        generatedAt: new Date().toISOString()
      },
      sections
    }
  }

  private enhanceScript(script: string): string {
    return script
      // Fix common AI generation issues
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      
      // Enhance vocal cues
      .replace(/\.\.\./g, '[pause]')
      .replace(/!{2,}/g, '! [emphasis]')
      .replace(/\?{2,}/g, '? [questioning tone]')
      
      // Improve transitions
      .replace(/\n\n+/g, '\n\n[brief pause]\n\n')
      
      // Clean up formatting
      .replace(/\s+/g, ' ')
      .trim()
  }

  private extractSections(script: string): Array<{ type: string; content: string; timestamp?: string }> {
    const sections = []
    const sectionMarkers = [
      /\[INTRO\](.*?)(?=\[|$)/gi,
      /\[SEGMENT \d+\]|\[MAIN CONTENT\]|\[BODY\](.*?)(?=\[|$)/gi,
      /\[CONCLUSION\]|\[OUTRO\]|\[ENDING\](.*?)(?=\[|$)/gi
    ]

    const sectionTypes = ['intro', 'main', 'conclusion']

    sectionMarkers.forEach((marker, index) => {
      const matches = script.match(marker)
      if (matches) {
        sections.push({
          type: sectionTypes[index] || 'content',
          content: matches[1]?.trim() || matches[0]?.trim() || '',
        })
      }
    })

    // If no sections found, create default sections
    if (sections.length === 0) {
      const paragraphs = script.split('\n\n').filter(p => p.trim().length > 0)
      const third = Math.floor(paragraphs.length / 3)
      
      if (paragraphs.length >= 3) {
        sections.push(
          { type: 'intro', content: paragraphs.slice(0, third).join('\n\n') },
          { type: 'main', content: paragraphs.slice(third, -third).join('\n\n') },
          { type: 'conclusion', content: paragraphs.slice(-third).join('\n\n') }
        )
      } else {
        sections.push({ type: 'content', content: script })
      }
    }

    return sections
  }

  private isProviderAvailable(provider: string): boolean {
    switch (provider) {
      case 'anthropic': return !!this.anthropic
      case 'openai': return !!this.openai
      case 'gemini': return !!this.gemini
      case 'cohere': return !!this.cohere
      default: return false
    }
  }

  // Get list of available providers
  getAvailableProviders(): string[] {
    const providers: string[] = []
    if (this.gemini) providers.push('gemini')
    if (this.openai) providers.push('openai')
    if (this.anthropic) providers.push('anthropic')
    if (this.cohere) providers.push('cohere')
    
    console.log('🔍 Available AI providers:', providers)
    return providers
  }


}