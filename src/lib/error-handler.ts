export interface ErrorInfo {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context: Record<string, any>
  suggestion: string
  retryable: boolean
  timestamp: string
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  exponentialBackoff: boolean
  retryableErrors: string[]
}

export class RobustErrorHandler {
  private static instance: RobustErrorHandler
  private errorLog: ErrorInfo[] = []
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
    retryableErrors: [
      'NETWORK_ERROR',
      'RATE_LIMIT',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_SERVER_ERROR'
    ]
  }

  static getInstance(): RobustErrorHandler {
    if (!RobustErrorHandler.instance) {
      RobustErrorHandler.instance = new RobustErrorHandler()
    }
    return RobustErrorHandler.instance
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Record<string, any> = {},
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig }
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        const errorInfo = this.categorizeError(error as Error, context)
        
        this.logError(errorInfo)
        
        if (attempt === config.maxRetries || !errorInfo.retryable) {
          throw this.enhanceError(error as Error, errorInfo)
        }
        
        const delay = this.calculateDelay(attempt, config)
        console.warn(`Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms...`, errorInfo)
        
        await this.delay(delay)
      }
    }
    
    throw lastError
  }

  categorizeError(error: Error, context: Record<string, any> = {}): ErrorInfo {
    const timestamp = new Date().toISOString()
    
    // Network and connectivity errors
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connectivity issue',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'Check internet connection and try again',
        retryable: true,
        timestamp
      }
    }
    
    // Rate limiting errors
    if (error.message.includes('rate limit') || error.message.includes('429') || error.message.includes('quota')) {
      return {
        code: 'RATE_LIMIT',
        message: 'API rate limit exceeded',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'Wait before making more requests or upgrade your API plan',
        retryable: true,
        timestamp
      }
    }
    
    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('401') || error.message.includes('API_KEY')) {
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        severity: 'high',
        context: { ...context, originalError: error.message },
        suggestion: 'Check API keys and credentials',
        retryable: false,
        timestamp
      }
    }
    
    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return {
        code: 'TIMEOUT',
        message: 'Operation timed out',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'Try again with a longer timeout or simpler request',
        retryable: true,
        timestamp
      }
    }
    
    // Service unavailable
    if (error.message.includes('503') || error.message.includes('502') || error.message.includes('504')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'The service is experiencing issues. Try again later',
        retryable: true,
        timestamp
      }
    }
    
    // Content policy violations
    if (error.message.includes('content policy') || error.message.includes('safety') || error.message.includes('blocked')) {
      return {
        code: 'CONTENT_POLICY',
        message: 'Content violates service policies',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'Modify your content to comply with service policies',
        retryable: false,
        timestamp
      }
    }
    
    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('400')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input or parameters',
        severity: 'low',
        context: { ...context, originalError: error.message },
        suggestion: 'Check your input parameters and try again',
        retryable: false,
        timestamp
      }
    }
    
    // Browser/Playwright specific errors
    if (error.message.includes('playwright') || error.message.includes('browser') || error.message.includes('page')) {
      return {
        code: 'BROWSER_ERROR',
        message: 'Browser automation error',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'The website may be blocking automated access. Try a different approach',
        retryable: true,
        timestamp
      }
    }
    
    // File system errors
    if (error.message.includes('ENOENT') || error.message.includes('EACCES') || error.message.includes('file')) {
      return {
        code: 'FILE_SYSTEM_ERROR',
        message: 'File system operation failed',
        severity: 'medium',
        context: { ...context, originalError: error.message },
        suggestion: 'Check file permissions and disk space',
        retryable: false,
        timestamp
      }
    }
    
    // Generic server errors
    if (error.message.includes('500') || error.message.includes('internal')) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        severity: 'high',
        context: { ...context, originalError: error.message },
        suggestion: 'This is a server-side issue. Please try again later',
        retryable: true,
        timestamp
      }
    }
    
    // Unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      severity: 'medium',
      context: { ...context, originalError: error.message, stack: error.stack },
      suggestion: 'Please try again or contact support if the issue persists',
      retryable: false,
      timestamp
    }
  }

  private enhanceError(originalError: Error, errorInfo: ErrorInfo): Error {
    const enhancedError = new Error(errorInfo.message)
    enhancedError.name = errorInfo.code
    enhancedError.stack = originalError.stack
    
    // Add custom properties
    ;(enhancedError as any).errorInfo = errorInfo
    ;(enhancedError as any).severity = errorInfo.severity
    ;(enhancedError as any).suggestion = errorInfo.suggestion
    ;(enhancedError as any).retryable = errorInfo.retryable
    
    return enhancedError
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    if (!config.exponentialBackoff) {
      return config.baseDelay
    }
    
    const exponentialDelay = config.baseDelay * Math.pow(2, attempt)
    const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
    
    return Math.min(exponentialDelay + jitter, config.maxDelay)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo)
    
    // Keep only last 100 errors to prevent memory leaks
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100)
    }
    
    // Log to console with appropriate level
    const logMethod = {
      low: console.info,
      medium: console.warn,
      high: console.error,
      critical: console.error
    }[errorInfo.severity]
    
    logMethod(`[${errorInfo.code}] ${errorInfo.message}`, errorInfo)
  }

  // Get recent errors for debugging
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorLog.slice(-limit)
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorInfo['severity']): ErrorInfo[] {
    return this.errorLog.filter(error => error.severity === severity)
  }

  // Get error statistics
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    
    this.errorLog.forEach(error => {
      stats[error.code] = (stats[error.code] || 0) + 1
    })
    
    return stats
  }

  // Check if system is healthy
  isSystemHealthy(): boolean {
    const recentErrors = this.getRecentErrors(20)
    const criticalErrors = recentErrors.filter(error => error.severity === 'critical')
    const highErrors = recentErrors.filter(error => error.severity === 'high')
    
    // System is unhealthy if more than 2 critical errors or 5 high errors in recent history
    return criticalErrors.length <= 2 && highErrors.length <= 5
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }

  // Update retry configuration
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config }
  }
}

// Global error handler instance
export const errorHandler = RobustErrorHandler.getInstance()

// Utility function for quick error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return errorHandler.executeWithRetry(operation, context, retryConfig)
}