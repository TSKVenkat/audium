import { chromium, Browser, Page } from 'playwright'
import * as cheerio from 'cheerio'

interface ScrapingOptions {
  useJavaScript?: boolean
  waitTime?: number
  userAgent?: string
  proxy?: string
  retries?: number
  timeout?: number
  removeElements?: string[]
  extractSpecific?: {
    title?: string[]
    content?: string[]
    metadata?: string[]
  }
}

interface ScrapingResult {
  success: boolean
  title: string
  content: string
  metadata: {
    description?: string
    author?: string
    publishDate?: string
    wordCount: number
    url: string
    extractedAt: string
    method: 'cheerio' | 'playwright'
  }
  images?: string[]
  links?: string[]
  error?: string
}

export class RobustWebScraper {
  private defaultOptions: ScrapingOptions = {
    useJavaScript: true,
    waitTime: 3000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    retries: 3,
    timeout: 30000,
    removeElements: [
      'script', 'style', 'nav', 'header', 'footer', 'aside', 
      '.advertisement', '.ad', '#comments', '.popup', '.modal',
      '.newsletter', '.social-share', '.related-posts', '.sidebar'
    ]
  }

  async scrape(url: string, options: ScrapingOptions = {}): Promise<ScrapingResult> {
    const config = { ...this.defaultOptions, ...options }
    let lastError: Error | null = null

    // Try multiple scraping methods in order of robustness
    const methods = [
      () => this.scrapeWithPlaywright(url, config),
      () => this.scrapeWithCheerio(url, config)
    ]

    for (let attempt = 0; attempt < config.retries!; attempt++) {
      for (const method of methods) {
        try {
          const result = await method()
          if (result.success && result.content.length > 100) {
            return result
          }
        } catch (error) {
          lastError = error as Error
          console.warn(`Scraping attempt failed:`, error)
        }
      }
      
      if (attempt < config.retries! - 1) {
        await this.delay(1000 * (attempt + 1)) // Exponential backoff
      }
    }

    return {
      success: false,
      title: '',
      content: '',
      metadata: {
        wordCount: 0,
        url,
        extractedAt: new Date().toISOString(),
        method: 'cheerio'
      },
      error: lastError?.message || 'All scraping methods failed'
    }
  }

  private async scrapeWithPlaywright(url: string, options: ScrapingOptions): Promise<ScrapingResult> {
    let browser: Browser | null = null
    let page: Page | null = null

    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })

      page = await browser.newPage({
        userAgent: options.userAgent,
        viewport: { width: 1920, height: 1080 }
      })

      // Set extra headers to appear more human-like
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      })

      // Navigate to the page
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: options.timeout 
      })

      // Wait for dynamic content to load
      if (options.waitTime) {
        await page.waitForTimeout(options.waitTime)
      }

      // Try to close any popups/modals
      try {
        await page.click('[data-dismiss="modal"], .modal-close, .popup-close, .close-button', { timeout: 2000 })
      } catch {
        // Ignore if no popups found
      }

      // Remove unwanted elements
      if (options.removeElements) {
        for (const selector of options.removeElements) {
          await page.$$eval(selector, elements => 
            elements.forEach(el => el.remove())
          ).catch(() => {})
        }
      }

      // Extract content using multiple strategies
      const title = await this.extractTitle(page)
      const content = await this.extractContent(page, options)
      const metadata = await this.extractMetadata(page, url)

      await browser.close()

      return {
        success: true,
        title,
        content,
        metadata: {
          ...metadata,
          wordCount: content.split(/\s+/).length,
          url,
          extractedAt: new Date().toISOString(),
          method: 'playwright'
        }
      }

    } catch (error) {
      if (browser) await browser.close()
      throw error
    }
  }

  private async scrapeWithAlternativeJS(url: string, _options: ScrapingOptions): Promise<ScrapingResult> {
    // This is a placeholder for future implementation of alternative JS rendering
    // Can use JSDOM or other lightweight solutions
    // Alternative JS scraping method - not implemented
    throw new Error('Alternative JS scraping not available - using Playwright or Cheerio fallback')
  }

  private async scrapeWithCheerio(url: string, options: ScrapingOptions): Promise<ScrapingResult> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': options.userAgent!,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
      },
      signal: AbortSignal.timeout(options.timeout!)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove unwanted elements
    if (options.removeElements) {
      $(options.removeElements.join(', ')).remove()
    }

    const title = $('title').text() || $('h1').first().text() || 'Untitled'
    
    let content = ''
    const contentSelectors = [
      'article', '[role="main"]', '.content', '.post-content',
      '.entry-content', '.article-body', 'main', '.main-content'
    ]

    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length && element.text().trim().length > 100) {
        content = element.text().trim()
        break
      }
    }

    if (!content) {
      content = $('body').text().trim()
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || ''

    return {
      success: true,
      title,
      content,
      metadata: {
        description,
        wordCount: content.split(/\s+/).length,
        url,
        extractedAt: new Date().toISOString(),
        method: 'cheerio'
      }
    }
  }

  private async extractTitle(page: Page): Promise<string> {
    const titleSelectors = [
      'title',
      'h1',
      '[property="og:title"]',
      '.post-title',
      '.article-title',
      '.entry-title'
    ]

    for (const selector of titleSelectors) {
      try {
        const title = await page.$eval(selector, el => 
          el.getAttribute('content') || el.textContent || ''
        )
        if (title && title.trim().length > 0) {
          return title.trim()
        }
      } catch {
        continue
      }
    }

    return 'Untitled'
  }

  private async extractContent(page: Page, options: ScrapingOptions): Promise<string> {
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-body',
      'main',
      '.main-content',
      '.post-body',
      '.story-body'
    ]

    // Try specific selectors first
    if (options.extractSpecific?.content) {
      for (const selector of options.extractSpecific.content) {
        try {
          const content = await page.$eval(selector, el => el.textContent || '')
          if (content && content.trim().length > 100) {
            return this.cleanContent(content)
          }
        } catch {
          continue
        }
      }
    }

    // Try default selectors
    for (const selector of contentSelectors) {
      try {
        const content = await page.$eval(selector, el => el.textContent || '')
        if (content && content.trim().length > 100) {
          return this.cleanContent(content)
        }
      } catch {
        continue
      }
    }

    // Fallback to body
    const content = await page.$eval('body', el => el.textContent || '')
    return this.cleanContent(content)
  }

  private async extractMetadata(page: Page, _url: string): Promise<Record<string, string | null>> {
    const metadata: Record<string, string | null> = {}

    try {
      metadata.description = await page.$eval('meta[name="description"]', el => 
        el.getAttribute('content')
      ).catch(() => null)

      metadata.author = await page.$eval('meta[name="author"], [rel="author"]', el => 
        el.getAttribute('content') || el.textContent
      ).catch(() => null)

      metadata.publishDate = await page.$eval('meta[property="article:published_time"], time[datetime]', el => 
        el.getAttribute('content') || el.getAttribute('datetime')
      ).catch(() => null)

    } catch {
      // Ignore metadata extraction errors
    }

    return metadata
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')
      .trim()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Method to test if a URL is scrapeable
  async testUrl(url: string): Promise<{ accessible: boolean; hasJavaScript: boolean; contentLength: number }> {
    try {
      // Quick check with fetch
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': this.defaultOptions.userAgent! }
      })

      if (!response.ok) {
        return { accessible: false, hasJavaScript: false, contentLength: 0 }
      }

      // Quick content check
      const basicResult = await this.scrapeWithCheerio(url, {})
      const hasJavaScript = basicResult.content.length < 100 // Likely needs JS if very little content

      return {
        accessible: true,
        hasJavaScript,
        contentLength: basicResult.content.length
      }

    } catch {
      return { accessible: false, hasJavaScript: false, contentLength: 0 }
    }
  }
}