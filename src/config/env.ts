import { config as loadEnv } from 'dotenv'
import type { StringValue } from 'ms'

loadEnv()

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseJwtExpiresIn(value: string | undefined): StringValue | number {
  const numeric = Number(value)
  if (!Number.isNaN(numeric)) {
    return numeric
  }

  return value as StringValue
}

function parseClientUrls(value: string | undefined): string[] {
  if (!value) {
    return ['http://localhost:5173']
  }
  return value.split(',').map(url => url.trim()).filter(Boolean)
}

export const env = {
  nodeEnv: process.env.ENV || 'development',
  port: Number(requireEnv('PORT')),
  clientUrls: parseClientUrls(requireEnv('CLIENT_URL')),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  mongoUri: requireEnv('MONGO_URI'),
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: parseJwtExpiresIn(requireEnv('JWT_EXPIRES_IN')),
  },
  redis: {
    url: requireEnv('REDIS_URL'),
    ttlSeconds: Number(requireEnv('REDIS_TTL_SECONDS')),
  },
  cloudinary: {
    cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: requireEnv('CLOUDINARY_API_KEY'),
    apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
  },
  livekit: {
    url: requireEnv('LIVEKIT_URL'),
    apiKey: requireEnv('LIVEKIT_API_KEY'),
    apiSecret: requireEnv('LIVEKIT_API_SECRET'),
  },
  cesium: {
    ionToken: requireEnv('CESIUM_ION_TOKEN'),
  },
  googleOAuth: {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
  },
  gateways: {
    github: {
      secret: process.env.GITHUB_GATEWAY_SECRET,
    },
  },
}
