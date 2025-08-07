import { NextRequest, NextResponse } from 'next/server'
import { RobustWebScraper } from '@/lib/robust-scraper'
import { withErrorHandling } from '@/lib/error-handler'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require authentication
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format and domain restrictions
    let parsedUrl;
    try {
      parsedUrl = new URL(url)
      
      // Basic security: block localhost and private IPs
      const hostname = parsedUrl.hostname.toLowerCase()
      if (hostname === 'localhost' || 
          hostname.startsWith('127.') || 
          hostname.startsWith('192.168.') || 
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return NextResponse.json(
          { error: 'Private or local URLs are not allowed for security reasons' },
          { status: 400 }
        )
      }
      
      // Ensure HTTPS for security (allow HTTP for testing)
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return NextResponse.json(
          { error: 'Only HTTP and HTTPS URLs are supported' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format. Please provide a valid web address.' },
        { status: 400 }
      )
    }

    // Use the new robust web scraper
    const scraper = new RobustWebScraper()
    

    
    const result = await withErrorHandling(
      () => scraper.scrape(url, {
        useJavaScript: true,
        waitTime: 3000,
        retries: 3,
        timeout: 30000
      }),
      { operation: 'web_scraping', url },
      { maxRetries: 2, baseDelay: 2000 } // Custom retry config for scraping
    )

      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.error || 'Failed to scrape webpage',
            suggestion: 'The website might be blocking automated requests or require special handling. Try copying the content manually.'
          },
          { status: 400 }
        )
      }

      // Validate content quality
      if (!result.content || result.content.length < 50) {
        return NextResponse.json(
          {
            error: 'Unable to extract meaningful content from this webpage.',
            suggestion: 'The page might be mostly scripts, images, or behind a paywall. Try copying the content manually.',
            extractedTitle: result.title
          },
          { status: 400 }
        )
      }

      // Check content quality
      const words = result.content.split(' ')
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
      if (avgWordLength < 3 || words.length < 50) {
        return NextResponse.json(
          {
            error: 'The extracted content appears to be navigation elements or very short text. This may not be suitable for podcast generation.',
            suggestion: 'Please try a URL with substantial article content, or use the "Text" input option.',
            extractedTitle: result.title
          },
          { status: 400 }
        )
      }

  

      return NextResponse.json({
        success: true,
        title: result.title,
        description: result.metadata.description || '',
        content: result.content,
        url,
        wordCount: result.metadata.wordCount,
        scrapingMethod: result.metadata.method,
        extractedAt: result.metadata.extractedAt
      })

  } catch (error) {
    console.error('Scraping error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Robust web scraping endpoint ready' })
}