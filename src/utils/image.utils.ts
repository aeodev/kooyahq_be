// Image URL utilities

/**
 * Check if URL is a GIF (exclude GIFs) - comprehensive check
 */
export function isGifUrl(url: string): boolean {
  if (!url) return false
  const urlLower = url.toLowerCase().trim()
  
  // Remove query params and fragments, then check for .gif extension
  const pathOnly = urlLower.split('?')[0].split('#')[0]
  
  // Check if path contains .gif (catches URLs like https://id.rlcdn.com/472486.gif)
  // Match .gif at end of path or followed by query/fragment
  return /\.gif(\?|#|$)/i.test(pathOnly) || pathOnly.endsWith('.gif')
}

/**
 * Normalize image URL (convert relative to absolute)
 */
export function normalizeImageUrl(url: string, baseUrl: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Validate URL
    try {
      new URL(url)
      return url
    } catch {
      return undefined
    }
  }
  if (url.startsWith('//')) {
    const normalized = `https:${url}`
    try {
      new URL(normalized)
      return normalized
    } catch {
      return undefined
    }
  }
  try {
    const base = new URL(baseUrl)
    const normalized = new URL(url, base.origin).href
    // Validate the normalized URL
    new URL(normalized)
    return normalized
  } catch {
    return undefined
  }
}
