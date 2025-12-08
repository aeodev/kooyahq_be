import { createHash } from 'crypto'

/**
 * Generate unique ID from URL and title using MD5 hash
 */
export function generateNewsId(url: string, title: string): string {
  return createHash('md5').update(`${url}:${title}`).digest('hex')
}
