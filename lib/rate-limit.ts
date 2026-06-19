// In-memory rate limiter — resets on every serverless cold start
const rateMap = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_REQUESTS = 20
const MAX_ENTRIES = 10_000

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateMap.get(userId)

  if (!entry || now > entry.resetAt) {
    if (rateMap.size >= MAX_ENTRIES && !rateMap.has(userId)) {
      const oldest = rateMap.keys().next().value
      if (oldest) rateMap.delete(oldest)
    }
    rateMap.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  entry.count++
  return { allowed: true }
}
