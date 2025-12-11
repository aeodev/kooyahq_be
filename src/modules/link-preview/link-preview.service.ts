import type { LinkPreview, LinkPreviewOptions } from './link-preview.types'
import { getCachedPreview, setCachedPreview } from './link-preview.cache'
import { isGifUrl, normalizeImageUrl } from '../../utils/image.utils'

// Extract meta tag content from HTML
function extractMetaTag(html: string, property: string, attribute: 'property' | 'name' | 'itemprop' = 'property'): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${property}["']`, 'i'),
  ]
  
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    }
  }
  
  return undefined
}

// Extract title from HTML
function extractTitle(html: string): string | undefined {
  // Try Open Graph title first
  const ogTitle = extractMetaTag(html, 'og:title')
  if (ogTitle) return ogTitle
  
  // Try Twitter title
  const twitterTitle = extractMetaTag(html, 'twitter:title', 'name')
  if (twitterTitle) return twitterTitle
  
  // Try HTML title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim()
  }
  
  return undefined
}

// Extract description from HTML
function extractDescription(html: string): string | undefined {
  // Try Open Graph description first
  const ogDesc = extractMetaTag(html, 'og:description')
  if (ogDesc) return ogDesc
  
  // Try Twitter description
  const twitterDesc = extractMetaTag(html, 'twitter:description', 'name')
  if (twitterDesc) return twitterDesc
  
  // Try meta description
  const metaDesc = extractMetaTag(html, 'description', 'name')
  if (metaDesc) return metaDesc
  
  return undefined
}

// Extract image from HTML with multiple strategies
function extractImage(html: string, baseUrl: string): string | undefined {
  // Strategy 1: Open Graph image (most reliable)
  const ogImage = extractMetaTag(html, 'og:image')
  if (ogImage && !isGifUrl(ogImage)) {
    const normalized = normalizeImageUrl(ogImage, baseUrl)
    return normalized && !isGifUrl(normalized) ? normalized : undefined
  }
  
  // Strategy 2: Twitter Card image
  const twitterImage = extractMetaTag(html, 'twitter:image', 'name')
  if (twitterImage && !isGifUrl(twitterImage)) {
    const normalized = normalizeImageUrl(twitterImage, baseUrl)
    return normalized && !isGifUrl(normalized) ? normalized : undefined
  }
  
  // Strategy 3: Schema.org image
  const schemaImage = extractMetaTag(html, 'image', 'itemprop')
  if (schemaImage && !isGifUrl(schemaImage)) {
    const normalized = normalizeImageUrl(schemaImage, baseUrl)
    return normalized && !isGifUrl(normalized) ? normalized : undefined
  }
  
  // Strategy 4: Find first substantial article image
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
  const candidateImages: Array<{ url: string; priority: number }> = []
  
  for (const match of imgMatches) {
    if (match[1]) {
      let imgUrl = match[1].trim()
      imgUrl = imgUrl
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      
      // Skip screenshots, covers, and non-article images
      const skipPatterns = [
        'avatar', 'icon', 'logo', 'badge', 'button', 'spinner', 'loading', 
        'profile', 'gravatar', 'cover', 'screenshot', 'og-image', 'social-card',
        'twitter-card', 'preview-card', 'meta-image'
      ]
      const shouldSkip = skipPatterns.some(pattern => 
        imgUrl.toLowerCase().includes(pattern)
      )
      
      // Skip GIFs
      if (shouldSkip || imgUrl.length < 10 || isGifUrl(imgUrl)) continue
      
      // Prefer actual article images (not social media cards)
      const imgTag = match[0]
      const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i)
      const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i)
      
      let priority = 0
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1])
        const height = parseInt(heightMatch[1])
        // Prefer larger images but skip if too wide (likely screenshots)
        if (width >= 1200) continue // Too wide, likely screenshot
        if (width >= 400 && height >= 300) priority += 10
        else if (width >= 200 || height >= 200) priority += 5
      }
      
      // Prefer images in article content areas
      if (/class=["'][^"']*(article|content|post|entry|body|main-content)[^"']*["']/i.test(imgTag)) {
        priority += 8
      }
      
      // Double-check normalized URL is not a GIF
      const normalized = normalizeImageUrl(imgUrl, baseUrl)
      if (normalized && !isGifUrl(normalized)) {
        candidateImages.push({ url: normalized, priority })
      }
    }
  }
  
  // Sort by priority and return best match
  if (candidateImages.length > 0) {
    candidateImages.sort((a, b) => b.priority - a.priority)
    const bestMatch = candidateImages[0].url
    // Final check - ensure it's not a GIF
    return bestMatch && !isGifUrl(bestMatch) ? bestMatch : undefined
  }
  
  return undefined
}

// Extract favicon
function extractFavicon(html: string, baseUrl: string): string | undefined {
  // Try various favicon link tags
  const faviconPatterns = [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
  ]
  
  for (const pattern of faviconPatterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return normalizeUrl(match[1], baseUrl)
    }
  }
  
  // Default favicon location
  try {
    const base = new URL(baseUrl)
    return `${base.origin}/favicon.ico`
  } catch {
    return undefined
  }
}

// Normalize URL (convert relative to absolute) - general purpose, not just images
function normalizeUrl(url: string, baseUrl: string): string {
  if (!url) return url
  
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Protocol-relative URL
  if (url.startsWith('//')) {
    return `https:${url}`
  }
  
  // Relative URL - resolve against base URL
  try {
    const base = new URL(baseUrl)
    return new URL(url, base.origin).href
  } catch {
    return url
  }
}

// Follow redirects
async function followRedirects(url: string, maxRedirects: number = 3): Promise<string> {
  let currentUrl = url
  for (let i = 0; i < maxRedirects; i++) {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 3000)
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (location) currentUrl = normalizeUrl(location, currentUrl)
        else break
      } else break
    } catch {
      break
    }
  }
  return currentUrl
}

// Main function to fetch link preview
export async function fetchLinkPreview(
  url: string,
  options: LinkPreviewOptions = {}
): Promise<LinkPreview> {
  const {
    timeout = 10000,
    followRedirects: shouldFollowRedirects = true,
    maxRedirects = 5,
  } = options
  
  // Check cache first
  const cached = await getCachedPreview(url)
  if (cached && (cached.image || cached.title)) {
    return cached
  }
  
  let finalUrl = url
  
  // Follow redirects if requested
  if (shouldFollowRedirects) {
    finalUrl = await followRedirects(url, maxRedirects)
  }
  
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeout)
    const response = await fetch(finalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    const preview: LinkPreview = {
      url: finalUrl,
      title: extractTitle(html),
      description: extractDescription(html),
      image: extractImage(html, finalUrl),
      siteName: extractMetaTag(html, 'og:site_name') || extractMetaTag(html, 'application-name', 'name'),
      author: extractMetaTag(html, 'author', 'name') || extractMetaTag(html, 'article:author'),
      publishedTime: extractMetaTag(html, 'article:published_time') || extractMetaTag(html, 'published_time'),
      type: extractMetaTag(html, 'og:type'),
      favicon: extractFavicon(html, finalUrl),
    }
    
    // Cache the result
    await setCachedPreview(finalUrl, preview)
    
    return preview
  } catch {
    return { url: finalUrl }
  }
}

// Convenience function to get just the image
export async function fetchImageFromUrl(url: string): Promise<string | undefined> {
  try {
    // Skip Reddit URLs - don't fetch images for Reddit posts
    if (url.includes('reddit.com/') || url.includes('redd.it/')) {
      return undefined
    }
    
    // For other sites, use HTML parsing
    const preview = await fetchLinkPreview(url, { timeout: 8000 })
    return preview.image
  } catch (error) {
    console.error(`Error in fetchImageFromUrl for ${url}:`, error)
    return undefined
  }
}
