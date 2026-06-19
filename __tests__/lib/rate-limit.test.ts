import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('checkRateLimit', () => {
  it('allows first request for a new user', () => {
    const result = checkRateLimit('user-1')
    expect(result.allowed).toBe(true)
    expect(result.retryAfter).toBeUndefined()
  })

  it('allows up to 20 requests within the window', () => {
    for (let i = 0; i < 20; i++) {
      const result = checkRateLimit('user-2')
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks the 21st request and provides retryAfter', () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit('user-3')
    }
    const result = checkRateLimit('user-3')
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
    expect(result.retryAfter).toBeLessThanOrEqual(60)
  })

  it('resets after the window expires', () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit('user-4')
    }

    expect(checkRateLimit('user-4').allowed).toBe(false)

    vi.advanceTimersByTime(60_001)

    const result = checkRateLimit('user-4')
    expect(result.allowed).toBe(true)
  })

  it('tracks different users independently', () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit('user-a')
    }

    expect(checkRateLimit('user-a').allowed).toBe(false)
    expect(checkRateLimit('user-b').allowed).toBe(true)
  })

  it('evicts oldest entry when MAX_ENTRIES exceeded', () => {
    for (let i = 0; i < 10001; i++) {
      checkRateLimit(`user-${i}`)
    }

    vi.advanceTimersByTime(60_001)

    const result = checkRateLimit('user-0')
    expect(result.allowed).toBe(true)
  })
})
