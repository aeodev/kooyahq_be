import { createClient, type RedisClientType } from 'redis'
import { env } from '../config/env'

let client: RedisClientType | null = null
let isConnecting = false

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({
      url: env.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Max retries reached')
          return Math.min(retries * 100, 3000) 
        }
      }
    })
    client.on('error', (err) => console.error('Redis error:', err))
    client.on('end', () => {
      isConnecting = false
    })
  }

  if (!client.isOpen && !isConnecting) {
    isConnecting = true
    try {
      await client.connect()
    } catch (error) {
      console.error('Redis connection error:', error)
      throw error
    } finally {
      isConnecting = false
    }
  }

  return client
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient()
    const raw = await redis.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (error) {
    console.error(`Redis get failed for key ${key}:`, error)
    return null
  }
}

export async function setJson<T>(key: string, value: T, ttlSeconds = env.redis.ttlSeconds): Promise<void> {
  try {
    const redis = await getRedisClient()
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds })
  } catch (error) {
    console.error(`Redis set failed for key ${key}:`, error)
  }
}

export async function deleteKeys(keys: string | string[]): Promise<void> {
  const keyList = Array.isArray(keys) ? keys : [keys]
  if (keyList.length === 0) return

  try {
    const redis = await getRedisClient()
    await redis.del(keyList)
  } catch (error) {
    console.error(`Redis delete failed for keys [${keyList.join(', ')}]:`, error)
  }
}

export async function closeRedisClient(): Promise<void> {
  if (client && client.isOpen) {
    try {
      await client.quit()
    } catch (error) {
      console.error('Error closing Redis client:', error)
    } finally {
      client = null
      isConnecting = false
    }
  }
}
