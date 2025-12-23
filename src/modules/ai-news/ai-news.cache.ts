import { createClient } from 'redis'
import { env } from '../../config/env'
import type { NewsFilter } from './ai-news.types'

let client: ReturnType<typeof createClient> | null = null
let isConnecting = false

const CACHE_TTL_SECONDS = 5 * 60 // 5 minutes

function getCacheKey(filter: NewsFilter, offset: number, limit: number): string {
  return `ai-news:${filter}:${offset}:${limit}`
}

async function getRedisClient() {
  if (!client) {
    client = createClient({ url: env.redis.url })
    client.on('error', err => console.error('Redis error:', err))
    client.on('connect', () => {
      isConnecting = false
    })
    client.on('disconnect', () => {
      isConnecting = false
    })
  }
  
  if (!client.isOpen && !isConnecting) {
    isConnecting = true
    try {
      await client.connect()
    } catch (error) {
      isConnecting = false
      throw error
    }
  }
  
  return client
}

// Graceful shutdown handler
export async function closeRedisConnection() {
  if (client && client.isOpen) {
    try {
      await client.quit()
    } catch (error) {
      console.error('Error closing Redis connection:', error)
    } finally {
      client = null
      isConnecting = false
    }
  }
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient()
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function setCached<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
  try {
    const redis = await getRedisClient()
    const ttl = ttlSeconds ?? CACHE_TTL_SECONDS
    await redis.set(key, JSON.stringify(data), { EX: ttl })
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

export async function clearCache(): Promise<void> {
  try {
    const redis = await getRedisClient()
    const keys = await redis.keys('ai-news:*')
    if (keys.length > 0) {
      await redis.del(keys)
    }
  } catch (error) {
    console.error('Redis clear error:', error)
  }
}

export async function getCachedQuery<T>(
  filter: NewsFilter,
  offset: number,
  limit: number
): Promise<T | null> {
  const key = getCacheKey(filter, offset, limit)
  return getCached<T>(key)
}

export async function setCachedQuery<T>(
  filter: NewsFilter,
  offset: number,
  limit: number,
  data: T
): Promise<void> {
  const key = getCacheKey(filter, offset, limit)
  await setCached(key, data)
}
