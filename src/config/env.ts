import { config as loadEnv } from 'dotenv'
import type { StringValue } from 'ms'

loadEnv()

const nodeEnv = process.env.ENV || 'development'

function normalizePathPrefix(value: string): string {
  return value
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

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

function validateAwsCredentials(accessKeyId?: string, secretAccessKey?: string) {
  const hasAccessKey = Boolean(accessKeyId)
  const hasSecretKey = Boolean(secretAccessKey)
  if (hasAccessKey !== hasSecretKey) {
    throw new Error('Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set together.')
  }
}

const storageEnvPrefix = normalizePathPrefix(process.env.S3_ENV_PREFIX || nodeEnv)
const s3AccessKeyId = process.env.AWS_ACCESS_KEY_ID || undefined
const s3SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || undefined
validateAwsCredentials(s3AccessKeyId, s3SecretAccessKey)

export const env = {
  nodeEnv,
  port: Number(requireEnv('PORT')),
  clientUrls: parseClientUrls(requireEnv('CLIENT_URL')),
  serverUrls: parseClientUrls(requireEnv('SERVER_URL')),
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
  s3: {
    bucket: requireEnv('S3_BUCKET'),
    region: requireEnv('S3_REGION'),
    envPrefix: storageEnvPrefix,
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
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
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  sendgrid: {
    apiKey: requireEnv('SENDGRID_API_KEY'),
    fromEmail: requireEnv('SENDGRID_FROM_EMAIL'),
  },
  polly: {
    region: process.env.AWS_POLLY_REGION || 'us-east-1',
    // Uses existing AWS credentials from s3 config
  },
}
