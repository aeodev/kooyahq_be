import { createClient } from 'redis'
import { env } from '../../config/env'

let client: ReturnType<typeof createClient> | null = null
let isConnecting = false

export const CACHE_KEY = 'ai-news:items'

async function getRedisClient() {
  if (!client) {
    client = createClient({ url: env.redisUrl })
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

export async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    const redis = await getRedisClient()
    await redis.set(key, JSON.stringify(data), { EX: env.redisTtlSeconds })
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

export async function clearCache(): Promise<void> {
  try {
    const redis = await getRedisClient()
    await redis.del(CACHE_KEY)
  } catch (error) {
    console.error('Redis clear error:', error)
  }
}

// Image caching is now handled by the link-preview module
