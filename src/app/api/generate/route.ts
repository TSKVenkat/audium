import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAIGenerator } from '@/lib/ai-providers'
import { IntelligentContentProcessor } from '@/lib/content-processor'
import { withErrorHandling } from '@/lib/error-handler'
import { getUserFromRequest, checkPlanLimits, updateUserUsage } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check plan limits
    if (!checkPlanLimits({ usage: { scriptsGenerated: 0, audioMinutes: 0, lastReset: new Date() }, plan: user.plan } as any, 'script', 1)) {
      return NextResponse.json(
        { error: 'Script generation limit reached for your plan' },
        { status: 403 }
      )
    }

    const { content, type, options = {} } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Enhanced generation options - declare early
    const generationOptions = {
      style: options.style || 'conversational',
      duration: options.duration || 'medium',
      audience: options.audience || 'general',
      tone: options.tone || 'friendly',
      customDuration: options.customDuration,
      includeMusic: options.includeMusic || false,
      voiceStyle: options.voiceStyle
    }

    // Initialize the enhanced AI generator
    console.log('Initializing AI generator...')
    const generator = new EnhancedAIGenerator()
    const availableProviders = generator.getAvailableProviders()
    console.log('Available AI providers:', availableProviders)

    // If no AI providers available, return service unavailable
    if (availableProviders.length === 0) {
      console.error('❌ No AI providers available')
      return NextResponse.json({
        success: false,
        error: 'Service unavailable: No AI providers are currently available. Please try again later.'
      }, { status: 503 })
    }

    // Initialize content processor
    const contentProcessor = new IntelligentContentProcessor()
    
    // Intelligently process content if AI providers are available
    let processedContent: any // eslint-disable-line @typescript-eslint/no-explicit-any
    if (contentProcessor.isProcessingAvailable()) {

      processedContent = await withErrorHandling(
        () => contentProcessor.processContent(content, type),
        { operation: 'content_processing', contentLength: content.length }
      )
      
      // Use enhanced content and analysis for better generation
      generationOptions.style = processedContent.analysis.suggestedStyle || generationOptions.style
      generationOptions.audience = processedContent.analysis.complexity === 'beginner' ? 'beginners' : 
                                   processedContent.analysis.complexity === 'advanced' ? 'expert' : 'general'
      generationOptions.duration = processedContent.analysis.recommendedDuration || generationOptions.duration
      generationOptions.tone = processedContent.analysis.emotionalTone || generationOptions.tone
      
      
    } else {
      
      processedContent = { enhancedContent: preprocessContent(content, type) }
    }

    // Generate the script with enhanced AI
    console.log('Starting script generation with content length:', processedContent.enhancedContent?.length || 0)
    console.log('Available providers:', availableProviders)
    
    const result = await withErrorHandling(
      () => generator.generatePodcastScript(processedContent.enhancedContent, generationOptions),
      { operation: 'script_generation', provider: 'multiple' }
    )

    if (!result.success) {
      console.error('❌ Script generation failed:', result.error)
      
      return NextResponse.json({
        success: false,
        error: result.error || 'Service unavailable: AI script generation failed. Please try again later.'
      }, { status: 503 })
    }



    // Update user usage
    try {
      await updateUserUsage(user.id, 1, undefined)
    } catch (error) {
      console.error('Failed to update user usage:', error)
    }

    return NextResponse.json({
      success: true,
      podcast: {
        title: "Generated Podcast",
        introduction: result.script.split('\n\n')[0] || "Welcome to this podcast episode.",
        mainContent: result.script,
        conclusion: result.script.split('\n\n').slice(-1)[0] || "Thank you for listening.",
        sections: result.sections || [],
        estimatedDuration: result.metadata.estimatedDuration || "10-15 minutes",
        keyTakeaways: []
      },
      script: result.script,
      sections: result.sections,
      metadata: {
        ...result.metadata,
        inputType: type,
        options: generationOptions,
        providersAvailable: availableProviders,
        contentAnalysis: processedContent.analysis || null,
        suggestedTitle: processedContent.suggestedTitle || null,
        processingTime: processedContent.processingTime || 0,
        userId: user.id,
        userPlan: user.plan
      }
    })

  } catch (error) {
    console.error('Script generation error:', error)
    
    try {
      const debugGenerator = new EnhancedAIGenerator()
      console.error('Available providers:', debugGenerator.getAvailableProviders())
    } catch (debugError) {
      console.error('Could not debug providers:', debugError)
    }
    
    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })

      // Specific error handling for different AI providers
      if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
      return NextResponse.json(
          { 
            error: 'AI provider authentication failed. Please check your API keys.',
            details: error.message 
          },
        { status: 401 }
      )
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please try again in a few minutes.',
            details: error.message 
          },
          { status: 429 }
        )
      }

      if (error.message.includes('content policy') || error.message.includes('safety')) {
        return NextResponse.json(
          { 
            error: 'Content violates AI provider policies. Please modify your input.',
            details: error.message 
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate podcast script',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try again with different content or check your AI provider configurations.'
      },
      { status: 500 }
    )
  }
}

// Content preprocessing for better AI generation
function preprocessContent(content: string, type?: string): string {
  let processed = content
  
  // Clean up common formatting issues
  processed = processed
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim()

  // Add context based on content type
  const typeContext = {
    file: 'This content was extracted from an uploaded document.',
    url: 'This content was scraped from a webpage.',
    text: 'This content was provided directly by the user.'
  }

  if (type && typeContext[type as keyof typeof typeContext]) {
    processed = `${typeContext[type as keyof typeof typeContext]}\n\n${processed}`
  }

  // Add length context for AI to optimize accordingly
  const wordCount = processed.split(/\s+/).length
  if (wordCount > 3000) {
    processed = `LONG CONTENT (${wordCount} words) - Please create a comprehensive podcast that covers the key themes thoroughly.\n\n${processed}`
  } else if (wordCount < 500) {
    processed = `SHORT CONTENT (${wordCount} words) - Please expand on the themes and add engaging context and examples.\n\n${processed}`
  }

  return processed
}

// This function is no longer used as section extraction is handled by the AI providers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractSections(script: string) {
  const sections = []
  const sectionRegex = /\[(.*?)\]([\s\S]*?)(?=\[|$)/g
  let match

  while ((match = sectionRegex.exec(script)) !== null) {
    const title = match[1].trim()
    const content = match[2].trim()
    
    if (content) {
      sections.push({
        title,
        content,
        wordCount: content.split(/\s+/).length
      })
    }
  }

  // If no sections found, treat the entire script as one section
  if (sections.length === 0) {
    sections.push({
      title: 'Podcast Script',
      content: script,
      wordCount: script.split(/\s+/).length
    })
  }

  return sections
}



export async function GET() {
  return NextResponse.json({ 
    message: 'Podcast script generation endpoint ready',
    model: 'gemini-1.5-flash',
    features: ['script generation', 'content analysis', 'style customization'],
    status: 'active'
  })
}