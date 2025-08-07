import { NextRequest, NextResponse } from 'next/server'
import { EnhancedTTSEngine } from '@/lib/enhanced-tts'
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

    const requestBody = await request.json()
    const { 
      script, 
      text = script, // Support both 'script' and 'text' parameters
      voice = 'default', 
      speed = 1.0, 
      provider = 'auto',
      enhanceAudio = true,
      style = 'conversational',
      emotion = 'neutral',
      addMusic = false,
      voiceStability = 0.5,
      voiceSimilarity = 0.75 
    } = requestBody

    const finalScript = text || script

    if (!finalScript) {
      return NextResponse.json(
        { error: 'Script or text is required' },
        { status: 400 }
      )
    }

    // Estimate audio duration (roughly 150 words per minute)
    const estimatedMinutes = Math.ceil(finalScript.split(' ').length / 150)
    
    // Check plan limits
    if (!checkPlanLimits({ usage: { scriptsGenerated: 0, audioMinutes: 0, lastReset: new Date() }, plan: user.plan } as any, 'audio', estimatedMinutes)) {
      return NextResponse.json(
        { error: 'Audio generation limit reached for your plan' },
        { status: 403 }
      )
    }

    // Initialize the enhanced TTS engine
    const ttsEngine = new EnhancedTTSEngine()
    const availableProviders = ttsEngine.getAvailableProviders()

    // System TTS is always available as ultimate fallback
    if (availableProviders.length === 0) {
      console.log('⚠️ No premium TTS providers available, using system TTS')
      // Don't return error - let system TTS handle it
    }



    console.log(`🎙️ TTS Request - Voice: ${voice}, Provider: ${provider}`)
    
    // Enhanced TTS options for realistic voice
    const ttsOptions = {
      voice: voice || 'adam', // Use EXACT voice specified
      speed: Math.max(0.8, Math.min(1.2, speed)), // Limit speed for naturalness
      provider: provider === 'auto' ? 'azure' : provider, // Use Azure as primary for consistency
      enhanceAudio: enhanceAudio !== false, // Allow disabling for previews
      style: style || 'conversational',
      emotion: emotion || 'natural',
      addMusic: false, // Focus on voice quality first
      voiceStability: Math.max(0.5, Math.min(0.9, voiceStability)), // Optimal stability range
      voiceSimilarity: Math.max(0.7, Math.min(0.95, voiceSimilarity)), // High similarity for consistency
      language: 'en-US',
      pitch: 1.0,
      volume: 1.0
    }

    // Generate audio with enhanced TTS and error handling
    const result = await withErrorHandling(
      () => ttsEngine.generateAudio(finalScript, ttsOptions),
      { operation: 'tts_generation', provider: ttsOptions.provider },
      { maxRetries: 2, baseDelay: 3000 }
    )

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to generate audio',
          availableProviders,
          fallback: {
            instruction: 'browser-tts',
            script: finalScript,
            message: 'Use browser Text-to-Speech API as fallback'
          },
          suggestions: [
            'Check TTS provider API keys',
            'Try a different voice or provider',
            'Use browser-based TTS as displayed'
          ]
        },
        { status: 206 } // Partial content - browser TTS available
      )
    }



    // Update user usage
    const actualMinutes = result.duration ? Math.ceil(result.duration / 60) : estimatedMinutes
    try {
      await updateUserUsage(user.id, undefined, actualMinutes)
    } catch (error) {
      console.error('Failed to update user usage:', error)
    }

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      format: result.format,
      size: result.size,
      provider: result.provider,
      voice: result.voice,
      enhancedAudio: result.enhancedAudio,
      metadata: {
        ...result.metadata,
        userId: user.id,
        userPlan: user.plan,
        usageInfo: {
          estimatedMinutes,
          actualMinutes,
          remaining: user.plan === 'free' ? 30 - actualMinutes : user.plan === 'pro' ? 300 - actualMinutes : 'unlimited'
        }
      },
      availableProviders
    })

  } catch (error) {
    console.error('TTS generation error:', error)
    
    // Enhanced error handling
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })

      // Specific error handling for different TTS providers
      if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
        return NextResponse.json(
          { 
            error: 'TTS provider authentication failed. Please check your API keys.',
            details: error.message,
            fallback: {
              instruction: 'browser-tts',
              script: await request.text() || '',
              message: 'Use browser Text-to-Speech API as fallback'
            }
          },
          { status: 206 }
        )
      }

      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please try again in a few minutes.',
            details: error.message,
            fallback: {
              instruction: 'browser-tts',
              script: await request.text() || '',
              message: 'Use browser Text-to-Speech API as fallback'
            }
          },
          { status: 206 }
        )
      }

      if (error.message.includes('content') || error.message.includes('policy')) {
        return NextResponse.json(
          { 
            error: 'Content violates TTS provider policies. Please modify your script.',
            details: error.message 
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      fallback: {
        instruction: 'browser-tts',
          script: '',
          message: 'Use browser Text-to-Speech API as fallback'
      },
      suggestions: [
          'Check TTS provider configurations',
          'Try different audio settings',
        'Use browser-based TTS as displayed'
      ]
      },
      { status: 206 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Enhanced TTS endpoint ready',
    features: [
      'Multiple TTS providers (ElevenLabs, AWS Polly, Google Cloud, Azure, System)',
      'Automatic provider fallback',
      'Audio enhancement and post-processing',
      'Voice customization and emotion control',
      'Professional audio quality optimization',
      'Browser TTS fallback support'
    ]
  })
}