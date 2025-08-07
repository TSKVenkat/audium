// Simple rate limiter for production use
export const RATE_LIMITS = {
  AUTH: { max: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  UPLOAD: { max: 10, window: 60 * 1000 }, // 10 requests per minute
  GENERATE: { max: 3, window: 60 * 1000 }, // 3 requests per minute
  TTS: { max: 5, window: 60 * 1000 } // 5 requests per minute
} as const;

const store = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(key: string, limit: { max: number; window: number }): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    store.set(key, { count: 1, resetTime: now + limit.window });
    return true;
  }

  if (record.count >= limit.max) {
    return false;
  }

  record.count++;
  return true;
}

