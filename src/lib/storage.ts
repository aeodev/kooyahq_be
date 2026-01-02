import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import { env } from '../config/env'

const s3Client = new S3Client({
  region: env.s3.region,
  credentials: env.s3.accessKeyId && env.s3.secretAccessKey
    ? {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      }
    : undefined,
})

function normalizeSegment(value: string): string {
  return value
    .split('/')
    .map(part => part.trim())
    .filter(part => part && part !== '.' && part !== '..')
    .join('/')
}

function withEnvPrefix(path: string): string {
  const normalizedPath = normalizeStoragePath(path)
  const prefix = normalizeSegment(env.s3.envPrefix)
  if (!prefix) return normalizedPath
  if (normalizedPath.startsWith(`${prefix}/`)) {
    return normalizedPath
  }
  return `${prefix}/${normalizedPath}`
}

export function normalizeStoragePath(value: string): string {
  return value.trim().replace(/^\/+/, '')
}

function buildStoragePath(folder: string, originalName?: string): string {
  const safeFolder = normalizeSegment(folder)
  const extension = originalName ? extname(originalName).toLowerCase() : ''
  const fileName = extension ? `${randomUUID()}${extension}` : randomUUID()
  return [safeFolder, fileName].filter(Boolean).join('/')
}

export function isStoragePath(value?: string): value is string {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/api/media/')) return false
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false
  return !/^https?:\/\//i.test(trimmed)
}

export async function uploadBufferToStorage(options: {
  buffer: Buffer
  contentType?: string
  folder: string
  originalName?: string
}): Promise<{ path: string }> {
  const key = buildStoragePath(options.folder, options.originalName)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: withEnvPrefix(key),
      Body: options.buffer,
      ContentType: options.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return { path: key }
}

export async function deleteStorageObject(path: string): Promise<void> {
  const key = withEnvPrefix(path)
  if (!key) return
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
    }),
  )
}

export async function getStorageObject(path: string, range?: string): Promise<{
  stream: Readable
  contentType?: string
  contentLength?: number
  contentRange?: string
  acceptRanges?: string
  cacheControl?: string
}> {
  const key = withEnvPrefix(path)
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Range: range,
    }),
  )

  const body = response.Body
  if (!body || typeof (body as Readable).pipe !== 'function') {
    throw new Error('Storage object stream is unavailable')
  }

  return {
    stream: body as Readable,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    acceptRanges: response.AcceptRanges,
    cacheControl: response.CacheControl,
  }
}
