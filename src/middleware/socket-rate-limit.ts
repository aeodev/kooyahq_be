import { getRedisClient } from '../lib/redis'

type RateLimitOptions = {
  windowMs: number
  max: number
  keyPrefix: string
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Redis-based rate limiter for socket events
 * Uses sliding window algorithm
 */
export async function checkSocketRateLimit(
  userId: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { windowMs, max, keyPrefix } = options
  const now = Date.now()
  const key = `${keyPrefix}:${userId}`

  try {
    const redis = await getRedisClient()
    
    // Use Redis sorted set for sliding window
    // Score is timestamp, member is request ID
    const windowStart = now - windowMs
    
    // Remove old entries outside the window
    await redis.zRemRangeByScore(key, 0, windowStart)
    
    // Count current requests in window
    const count = await redis.zCard(key)
    
    if (count >= max) {
      // Rate limit exceeded
      // Get oldest entry to calculate retry-after
      const oldest = await redis.zRange(key, 0, 0, { REV: false })
      const oldestTimestamp = oldest.length > 0 ? Number(oldest[0]) : now
      const resetAt = oldestTimestamp + windowMs
      const retryAfter = Math.ceil((resetAt - now) / 1000)
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: retryAfter > 0 ? retryAfter : undefined,
      }
    }
    
    // Add current request
    const requestId = `${now}-${Math.random()}`
    await redis.zAdd(key, { score: now, value: requestId })
    
    // Set expiration on the key (windowMs + small buffer)
    await redis.expire(key, Math.ceil((windowMs / 1000) + 60))
    
    return {
      allowed: true,
      remaining: max - count - 1,
      resetAt: now + windowMs,
    }
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.error(`[Rate Limit] Redis error for key ${key}, allowing request:`, error)
    return {
      allowed: true,
      remaining: max,
      resetAt: now + windowMs,
    }
  }
}

/**
 * Create rate limiter for AI assistant messages
 */
export async function checkAIAssistantRateLimit(userId: string): Promise<RateLimitResult> {
  // Check both minute and hour limits
  const minuteLimit = await checkSocketRateLimit(userId, {
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    keyPrefix: 'ai:rate-limit:minute',
  })
  
  if (!minuteLimit.allowed) {
    return minuteLimit
  }
  
  const hourLimit = await checkSocketRateLimit(userId, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    keyPrefix: 'ai:rate-limit:hour',
  })
  
  return hourLimit
}

