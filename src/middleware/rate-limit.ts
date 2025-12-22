import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'

type RateLimitOptions = {
  windowMs: number
  max: number
  keyPrefix?: string
  getKey?: (req: Request) => string
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, RateLimitEntry>()
  const windowMs = options.windowMs
  const max = options.max
  const keyPrefix = options.keyPrefix ?? 'rate-limit'
  const getKey = options.getKey ?? ((req) => req.user?.id ?? req.ip ?? 'anonymous')

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    const key = `${keyPrefix}:${getKey(req)}`
    const entry = hits.get(key)

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      if (retryAfter > 0) {
        res.setHeader('Retry-After', String(retryAfter))
      }
      return next(createHttpError(429, 'Too many requests, please try again later'))
    }

    entry.count += 1
    return next()
  }
}
