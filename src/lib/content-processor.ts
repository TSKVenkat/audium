import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ContentAnalysis {
  mainTopics: string[]
  keyInsights: string[]
  complexity: 'beginner' | 'intermediate' | 'advanced'
  recommendedDuration: 'short' | 'medium' | 'long'
  contentType: 'educational' | 'news' | 'technical' | 'entertainment' | 'business'
  emotionalTone: 'neutral' | 'positive' | 'serious' | 'urgent' | 'inspiring'
  suggestedStyle: 'conversational' | 'professional' | 'educational' | 'entertaining'
  wordCount: number
  readingLevel: string
}

export interface ProcessedContent {
  originalContent: string
  enhancedContent: string
  summary: string
  analysis: ContentAnalysis
  structuredData: {
    introduction: string
    mainPoints: string[]
    conclusion: string
    quotes: string[]
    statistics: string[]
    examples: string[]
  }
  seoKeywords: string[]
  suggestedTitle: string
  processingTime: number
}

export class IntelligentContentProcessor {
  private openai?: OpenAI
  private gemini?: GoogleGenerativeAI

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey)
    }
  }

  async processContent(content: string, _contentType?: string): Promise<ProcessedContent> {
    const startTime = Date.now()
    
    try {
      // Basic content analysis
      const basicAnalysis = this.analyzeContentBasic(content)
      
      // Enhanced content processing with AI
      const enhancedData = await this.enhanceContentWithAI(content, basicAnalysis)
      
      // Structure the content for podcast optimization
      const structuredData = await this.structureContent(content, basicAnalysis)
      
      // Generate SEO keywords and title suggestions
      const seoData = await this.generateSEOData(content, basicAnalysis)
      
      const processingTime = Date.now() - startTime
      
      return {
        originalContent: content,
        enhancedContent: enhancedData.enhancedContent,
        summary: enhancedData.summary,
        analysis: {
          ...basicAnalysis,
          ...enhancedData.analysis
        },
        structuredData,
        seoKeywords: seoData.keywords,
        suggestedTitle: seoData.title,
        processingTime
      }
      
    } catch (error) {
      console.error('Content processing failed:', error)
      
      // Fallback to basic processing
      return this.processContentBasic(content)
    }
  }

  private analyzeContentBasic(content: string): ContentAnalysis {
    const words = content.split(/\s+/)
    const wordCount = words.length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = wordCount / sentences.length
    
    // Determine complexity based on sentence length and vocabulary
    let complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
    if (avgWordsPerSentence < 15 && wordCount < 1000) {
      complexity = 'beginner'
    } else if (avgWordsPerSentence > 25 || wordCount > 3000) {
      complexity = 'advanced'
    }
    
    // Recommend duration based on word count
    let recommendedDuration: 'short' | 'medium' | 'long' = 'medium'
    if (wordCount < 800) recommendedDuration = 'short'
    else if (wordCount > 2500) recommendedDuration = 'long'
    
    // Basic content type detection
    const contentTypeKeywords = {
      educational: ['learn', 'study', 'education', 'tutorial', 'guide', 'how to'],
      news: ['breaking', 'report', 'today', 'latest', 'update', 'announced'],
      technical: ['system', 'algorithm', 'technology', 'software', 'development'],
      entertainment: ['funny', 'entertainment', 'story', 'amazing', 'incredible'],
      business: ['market', 'business', 'company', 'revenue', 'profit', 'strategy']
    }
    
    let detectedType: keyof typeof contentTypeKeywords = 'educational'
    let maxMatches = 0
    
    for (const [type, keywords] of Object.entries(contentTypeKeywords)) {
      const matches = keywords.filter(keyword => 
        content.toLowerCase().includes(keyword)
      ).length
      if (matches > maxMatches) {
        maxMatches = matches
        detectedType = type as keyof typeof contentTypeKeywords
      }
    }
    
    // Extract main topics (simple keyword extraction)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'])
    const wordFreq = new Map<string, number>()
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '')
      if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
        wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1)
      }
    })
    
    const mainTopics = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
    
    return {
      mainTopics,
      keyInsights: [], // Will be filled by AI
      complexity,
      recommendedDuration,
      contentType: detectedType,
      emotionalTone: 'neutral', // Will be analyzed by AI
      suggestedStyle: this.getSuggestedStyle(detectedType),
      wordCount,
      readingLevel: this.calculateReadingLevel(avgWordsPerSentence, wordCount)
    }
  }

  private async enhanceContentWithAI(content: string, basicAnalysis: ContentAnalysis): Promise<{
    enhancedContent: string
    summary: string
    analysis: Partial<ContentAnalysis>
  }> {
    const prompt = `
Analyze this content for podcast creation. Provide:

1. ENHANCED_CONTENT: Rewrite the content to be more engaging for audio format, adding transitions, vocal cues, and conversational elements
2. SUMMARY: A 2-3 sentence summary capturing the essence
3. KEY_INSIGHTS: 3-5 main takeaways or insights
4. EMOTIONAL_TONE: One of (neutral, positive, serious, urgent, inspiring)
5. CONTENT_TYPE: One of (educational, news, technical, entertainment, business)

Content to analyze:
${content}

Format your response as JSON:
{
  "enhancedContent": "...",
  "summary": "...",
  "keyInsights": [...],
  "emotionalTone": "...",
  "contentType": "..."
}
`

    try {
      if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7
        })
        
        const result = JSON.parse(response.choices[0]?.message?.content || '{}')
        return {
          enhancedContent: result.enhancedContent || content,
          summary: result.summary || '',
          analysis: {
            keyInsights: result.keyInsights || [],
            emotionalTone: result.emotionalTone || basicAnalysis.emotionalTone,
            contentType: result.contentType || basicAnalysis.contentType
          }
        }
      }
      
      if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ 
          model: 'gemini-1.5-flash', // Higher rate limits than Pro
          generationConfig: {
            maxOutputTokens: 2000, // Reduced for content enhancement
            temperature: 0.5,
          }
        })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        try {
          const parsed = JSON.parse(text)
          return {
            enhancedContent: parsed.enhancedContent || content,
            summary: parsed.summary || '',
            analysis: {
              keyInsights: parsed.keyInsights || [],
              emotionalTone: parsed.emotionalTone || basicAnalysis.emotionalTone,
              contentType: parsed.contentType || basicAnalysis.contentType
            }
          }
        } catch {
          // If JSON parsing fails, extract manually
          return {
            enhancedContent: content,
            summary: text.substring(0, 200) + '...',
            analysis: {}
          }
        }
      }
      
    } catch (error) {
      console.error('AI content enhancement failed:', error)
    }
    
    // Fallback enhancement
    return {
      enhancedContent: this.enhanceContentBasic(content),
      summary: content.substring(0, 200) + '...',
      analysis: {}
    }
  }

  private async structureContent(content: string, _analysis: ContentAnalysis): Promise<{
    introduction: string
    mainPoints: string[]
    conclusion: string
    quotes: string[]
    statistics: string[]
    examples: string[]
  }> {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
    
    // Simple structure extraction
    const introduction = paragraphs[0] || ''
    const conclusion = paragraphs[paragraphs.length - 1] || ''
    const mainPoints = paragraphs.slice(1, -1)
    
    // Extract quotes (content in quotation marks)
    const quotes = content.match(/"([^"]+)"/g) || []
    
    // Extract statistics (numbers with %)
    const statistics = content.match(/\d+\.?\d*%/g) || []
    
    // Extract examples (sentences that contain "for example", "such as", etc.)
    const exampleSentences = content.split(/[.!?]+/).filter(sentence =>
      /\b(for example|such as|for instance|like|including)\b/i.test(sentence)
    )
    
    return {
      introduction,
      mainPoints: mainPoints.slice(0, 5), // Limit to 5 main points
      conclusion,
      quotes: quotes.slice(0, 3),
      statistics: statistics.slice(0, 5),
      examples: exampleSentences.slice(0, 3)
    }
  }

  private async generateSEOData(content: string, _analysis: ContentAnalysis): Promise<{
    keywords: string[]
    title: string
  }> {
    try {
      if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Generate 5 SEO keywords and a compelling podcast title for this content:\n\n${content.substring(0, 1000)}`
          }],
          max_tokens: 150
        })
        
        const result = response.choices[0]?.message?.content || ''
        const lines = result.split('\n').filter(line => line.trim())
        
        return {
          keywords: _analysis.mainTopics.slice(0, 5),
          title: lines[0]?.replace(/^(Title:|Podcast Title:)/i, '').trim() || 'Untitled Podcast'
        }
      }
    } catch (error) {
      console.error('SEO generation failed:', error)
    }
    
    return {
      keywords: _analysis.mainTopics.slice(0, 5),
      title: `${_analysis.mainTopics[0] || 'Topic'} - Podcast Episode`
    }
  }

  private processContentBasic(content: string): ProcessedContent {
    const startTime = Date.now()
    const analysis = this.analyzeContentBasic(content)
    const enhanced = this.enhanceContentBasic(content)
    
    return {
      originalContent: content,
      enhancedContent: enhanced,
      summary: content.substring(0, 200) + '...',
      analysis,
      structuredData: {
        introduction: content.split('\n\n')[0] || '',
        mainPoints: content.split('\n\n').slice(1, 4),
        conclusion: content.split('\n\n').slice(-1)[0] || '',
        quotes: [],
        statistics: [],
        examples: []
      },
      seoKeywords: analysis.mainTopics.slice(0, 5),
      suggestedTitle: `${analysis.mainTopics[0] || 'Content'} Discussion`,
      processingTime: Date.now() - startTime
    }
  }

  private enhanceContentBasic(content: string): string {
    return content
      .replace(/\n\n/g, '\n\n[pause]\n\n')
      .replace(/([.!?])\s+/g, '$1 [brief pause] ')
      .replace(/^/gm, '[natural tone] ')
  }

  private getSuggestedStyle(contentType: string): 'conversational' | 'professional' | 'educational' | 'entertaining' {
    const styleMap: Record<string, any> = {
      educational: 'educational',
      news: 'professional',
      technical: 'educational',
      entertainment: 'entertaining',
      business: 'professional'
    }
    return styleMap[contentType] || 'conversational'
  }

  private calculateReadingLevel(avgWordsPerSentence: number, totalWords: number): string {
    // Simplified Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * (totalWords / 100))
    
    if (score >= 90) return 'Very Easy'
    if (score >= 80) return 'Easy'
    if (score >= 70) return 'Fairly Easy'
    if (score >= 60) return 'Standard'
    if (score >= 50) return 'Fairly Difficult'
    if (score >= 30) return 'Difficult'
    return 'Very Difficult'
  }

  // Method to test if content processing is available
  isProcessingAvailable(): boolean {
    return !!(this.openai || this.gemini)
  }

  // Get available AI providers for content processing
  getAvailableProviders(): string[] {
    const providers = []
    if (this.openai) providers.push('openai')
    if (this.gemini) providers.push('gemini')
    return providers
  }
}