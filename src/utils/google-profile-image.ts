import { isStoragePath, uploadBufferToStorage } from '../lib/storage'

const GOOGLE_PROFILE_IMAGE_FOLDER = 'profiles/google'
const GOOGLE_PROFILE_IMAGE_TIMEOUT_MS = 5000
const MAX_GOOGLE_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
const GOOGLE_HOST_SUFFIXES = ['.googleusercontent.com', '.ggpht.com']

function normalizeContentType(value?: string | null): string | undefined {
  if (!value) return undefined
  const normalized = value.split(';')[0].trim().toLowerCase()
  return normalized || undefined
}

function extensionFromContentType(value?: string): string | undefined {
  switch (value) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    case 'image/svg+xml':
      return '.svg'
    case 'image/avif':
      return '.avif'
    default:
      return undefined
  }
}

export function isGoogleProfileImageUrl(value?: string): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    const hostname = parsed.hostname.toLowerCase()
    return GOOGLE_HOST_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))
  } catch {
    return false
  }
}

export function isCachedGoogleProfilePath(value?: string): boolean {
  if (!value) return false
  if (!isStoragePath(value)) return false
  return value.startsWith(`${GOOGLE_PROFILE_IMAGE_FOLDER}/`)
}

export async function cacheGoogleProfileImage(url: string): Promise<string | undefined> {
  if (!isGoogleProfileImageUrl(url)) return undefined

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GOOGLE_PROFILE_IMAGE_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
    })

    if (!response.ok) return undefined

    const contentType = normalizeContentType(response.headers.get('content-type'))
    if (contentType && !contentType.startsWith('image/')) return undefined

    const contentLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_GOOGLE_PROFILE_IMAGE_BYTES) {
      return undefined
    }

    const arrayBuffer = await response.arrayBuffer()
    if (!arrayBuffer.byteLength || arrayBuffer.byteLength > MAX_GOOGLE_PROFILE_IMAGE_BYTES) {
      return undefined
    }

    const buffer = Buffer.from(arrayBuffer)
    const extension = extensionFromContentType(contentType)
    const originalName = extension ? `google-avatar${extension}` : undefined

    const { path } = await uploadBufferToStorage({
      buffer,
      contentType,
      folder: GOOGLE_PROFILE_IMAGE_FOLDER,
      originalName,
    })

    return path
  } catch {
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}
