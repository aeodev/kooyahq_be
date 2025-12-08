import { createClient } from 'redis'
import { env } from '../../config/env'

let client: ReturnType<typeof createClient> | null = null

const CACHE_PREFIX = 'link-preview:'
const CACHE_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

async function getRedisClient() {
  if (!client) {
    client = createClient({ url: env.redisUrl })
    client.on('error', err => console.error('Redis error:', err))
  }
  if (!client.isOpen) {
    await client.connect()
  }
  return client
}

function getCacheKey(url: string): string {
  return `${CACHE_PREFIX}${Buffer.from(url).toString('base64')}`
}

export async function getCachedPreview(url: string): Promise<any | null> {
  try {
    const redis = await getRedisClient()
    const key = getCacheKey(url)
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    return null
  }
}

export async function setCachedPreview(url: string, preview: any): Promise<void> {
  try {
    const redis = await getRedisClient()
    const key = getCacheKey(url)
    await redis.set(key, JSON.stringify(preview), { EX: CACHE_TTL })
  } catch (error) {
    // Silently fail - caching is not critical
  }
}

export async function clearPreviewCache(url?: string): Promise<void> {
  try {
    const redis = await getRedisClient()
    if (url) {
      const key = getCacheKey(url)
      await redis.del(key)
    } else {
      // Clear all link preview cache (use with caution)
      const keys = await redis.keys(`${CACHE_PREFIX}*`)
      if (keys.length > 0) {
        await redis.del(keys)
      }
    }
  } catch (error) {
    console.error('Error clearing preview cache:', error)
  }
}
