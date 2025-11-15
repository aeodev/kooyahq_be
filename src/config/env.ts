import { config as loadEnv } from 'dotenv'
import type { StringValue } from 'ms'

loadEnv()

const DEFAULT_PORT = 5001
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/kooyahq'

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const jwtSecret = requireEnv('JWT_SECRET')

const DEFAULT_JWT_EXPIRES_IN: StringValue = '7d'

function parseJwtExpiresIn(value: string | undefined): StringValue | number {
  if (!value) {
    return DEFAULT_JWT_EXPIRES_IN
  }

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
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  clientUrls: parseClientUrls(process.env.CLIENT_URL),
  jwtSecret,
  jwtExpiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
  mongoUri: process.env.MONGO_URI ?? DEFAULT_MONGO_URI,
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
}
