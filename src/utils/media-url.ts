import { env } from '../config/env'

const MEDIA_PROXY_PATH = '/api/media/file'

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function buildMediaProxyUrl(path: string): string {
  const base = env.serverUrls ? normalizeBaseUrl(env.serverUrls[0]) : ''
  const encodedPath = encodeURIComponent(path)
  const proxyPath = `${MEDIA_PROXY_PATH}?path=${encodedPath}`
  return base ? `${base}${proxyPath}` : proxyPath
}

export function resolveMediaUrl(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith(MEDIA_PROXY_PATH)) return trimmed
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return buildMediaProxyUrl(trimmed)
}
