import Parser from 'rss-parser'
import type { NewsItem, NewsSource } from './ai-news.types'
import { fetchImageFromUrl } from '../link-preview/link-preview.service'
import { isGifUrl, normalizeImageUrl } from '../../utils/image.utils'
import { cleanHtml, cleanTitle } from '../../utils/text.utils'
import { generateNewsId } from '../../utils/id.utils'
import { isSpam } from '../../utils/spam-filter.utils'
import { NewsItemModel } from './ai-news.model'
import { connectToDatabase } from '../../lib/mongo'

const parser = new Parser({
  timeout: 10000,
  customFields: { 
    item: [
      'media:content', 
      'enclosure', 
      'content:encoded',
      'itunes:image',
      'media:thumbnail'
    ] 
  },
})

const RSS_FEEDS: Record<NewsSource, string> = {
  openai: 'https://openai.com/news/rss.xml',
  techcrunch: 'https://techcrunch.com/category/artificial-intelligence/feed/',
  'google-ai': 'https://blog.google/technology/ai/rss/',
  reddit: 'https://www.reddit.com/r/MachineLearning/.rss',
  'reddit-artificial': 'https://www.reddit.com/r/artificial/.rss',
  hackernews: 'https://news.ycombinator.com/rss',
  'devto-ai': 'https://dev.to/feed/tag/ai',
  'devto-ml': 'https://dev.to/feed/tag/machinelearning',
  arxiv: 'http://arxiv.org/rss/cs.AI',
}

const SOURCE_AUTHORS: Record<NewsSource, string> = {
  openai: 'OpenAI',
  techcrunch: 'TechCrunch',
  'google-ai': 'Google AI',
  reddit: 'Reddit r/MachineLearning',
  'reddit-artificial': 'Reddit r/artificial',
  hackernews: 'Hacker News',
  'devto-ai': 'Dev.to AI',
  'devto-ml': 'Dev.to ML',
  arxiv: 'ArXiv AI',
}

// Extract image URL from RSS item - tries multiple sources

const extractImageUrl = (item: any): string | undefined => {
  const itemLink = item.link || ''
  // Try media:content first (common in many feeds)
  if (item['media:content']?.[0]?.$?.url) {
    const url = item['media:content'][0].$.url
    if (url && !isGifUrl(url) && (/\.(jpg|jpeg|png|webp|svg)$/i.test(url) || url.includes('image'))) {
      const normalized = normalizeImageUrl(url, itemLink)
      return normalized && !isGifUrl(normalized) ? normalized : undefined
    }
  }
  
  // Try media:thumbnail
  if (item['media:thumbnail']?.[0]?.$?.url) {
    const url = item['media:thumbnail'][0].$.url
    if (!isGifUrl(url)) {
      const normalized = normalizeImageUrl(url, itemLink)
      return normalized && !isGifUrl(normalized) ? normalized : undefined
    }
  }
  
  // Try itunes:image
  if (item['itunes:image']?.$?.href) {
    const url = item['itunes:image'].$.href
    if (!isGifUrl(url)) {
      const normalized = normalizeImageUrl(url, itemLink)
      return normalized && !isGifUrl(normalized) ? normalized : undefined
    }
  }
  
  // Try enclosure (for podcasts/media)
  if (item.enclosure?.url && /\.(jpg|jpeg|png|webp)$/i.test(item.enclosure.url) && !isGifUrl(item.enclosure.url)) {
    const normalized = normalizeImageUrl(item.enclosure.url, itemLink)
    return normalized && !isGifUrl(normalized) ? normalized : undefined
  }
  
  // Extract from content HTML (most RSS feeds embed images here)
  const content = item.content || item['content:encoded'] || item.contentSnippet || ''
  if (content && typeof content === 'string') {
    // Match img tags - get the first substantial image
    const imgMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
    for (const match of imgMatches) {
      if (match[1]) {
        let imgUrl = match[1].trim()
        // Decode HTML entities
        imgUrl = imgUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        
        // Skip common non-article images
        const skipPatterns = ['avatar', 'icon', 'logo', 'badge', 'button', 'spinner', 'loading']
        const shouldSkip = skipPatterns.some(pattern => 
          imgUrl.toLowerCase().includes(pattern)
        )
        
        // Prefer larger images (check for size hints in URL or attributes)
        // Skip GIFs
        if (!shouldSkip && imgUrl.length > 10 && !isGifUrl(imgUrl)) {
          // Try to get width/height from the img tag to prefer larger images
          const imgTag = match[0]
          const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i)
          const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i)
          
          // If it has size attributes and they're reasonable, use it
          if (widthMatch && heightMatch) {
            const width = parseInt(widthMatch[1])
            const height = parseInt(heightMatch[1])
            // Prefer images that are at least 200px in one dimension
            if (width >= 200 || height >= 200) {
              const normalized = normalizeImageUrl(imgUrl, itemLink)
              return normalized && !isGifUrl(normalized) ? normalized : undefined
            }
          } else {
            // No size info, but it's a valid image URL - normalize and return
            const normalized = normalizeImageUrl(imgUrl, itemLink)
            return normalized && !isGifUrl(normalized) ? normalized : undefined
          }
        }
      }
    }
    
    // Match background-image in style attributes
    const bgMatch = content.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i)
    if (bgMatch && bgMatch[1]) {
      let bgUrl = bgMatch[1].trim()
      bgUrl = bgUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      if (!isGifUrl(bgUrl)) {
        const normalized = normalizeImageUrl(bgUrl, itemLink)
        return normalized && !isGifUrl(normalized) ? normalized : undefined
      }
    }
  }
  
  return undefined
}

// Image fetching is now handled by the link-preview module

async function fetchFeed(source: NewsSource, url: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url)

  const items = (feed.items || [])
    .filter(item => item.link && item.title)
    .map(async (item) => {
      const rawTitle = item.title!
      const cleanedTitle = cleanTitle(rawTitle)
      
      // Extract image URL from RSS content and validate it's not a GIF
      let imageUrl = undefined
      if (source !== 'reddit' && source !== 'reddit-artificial') {
        const extracted = extractImageUrl(item)
        // Final validation: ensure it's not a GIF
        if (extracted && !isGifUrl(extracted)) {
          imageUrl = extracted
        }
        
        // If no image found in RSS, fetch from URL (with timeout)
        if (!imageUrl) {
          try {
            // Use a timeout wrapper to prevent hanging
            const imagePromise = fetchImageFromUrl(item.link!)
            const timeoutPromise = new Promise<undefined>((resolve) => 
              setTimeout(() => resolve(undefined), 5000)
            )
            const fetchedImage = await Promise.race([imagePromise, timeoutPromise])
            if (fetchedImage && !isGifUrl(fetchedImage)) {
              imageUrl = fetchedImage
            }
          } catch {
            // Silent fail - continue without image
          }
        }
      }
      
      return {
        id: generateNewsId(item.link!, rawTitle), // Use original title for ID generation
        type: 'news' as const,
        title: cleanedTitle,
        content: cleanHtml(item.contentSnippet || item.content || ''),
        author: SOURCE_AUTHORS[source],
        source,
        url: item.link!,
        publishedAt: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
        imageUrl,
      }
    })
  
  // Wait for all items to be processed (including image fetching)
  const resolvedItems = await Promise.allSettled(items)
  const newsItems = resolvedItems
    .filter((r): r is PromiseFulfilledResult<NewsItem> => r.status === 'fulfilled')
    .map(r => r.value)

  const filteredItems = newsItems.filter(item => {
    const isSpamContent = isSpam(item.title, item.content, item.url)
    if (isSpamContent) {
      console.log(`Filtered spam: ${item.title} (${item.url})`)
    }
    return !isSpamContent
  })

  // Save to MongoDB using upsert by URL
  await Promise.allSettled(
    filteredItems.map(async (item) => {
      try {
        await NewsItemModel.findOneAndUpdate(
          { url: item.url },
          {
            id: item.id,
            type: item.type,
            title: item.title,
            content: item.content,
            author: item.author,
            source: item.source,
            url: item.url,
            publishedAt: new Date(item.publishedAt),
            imageUrl: item.imageUrl,
          },
          { upsert: true, new: true }
        )
      } catch (error) {
        console.error(`Failed to save news item ${item.url}:`, error)
      }
    })
  )

  return filteredItems
  } catch (error) {
    console.error(`Error fetching feed ${source} from ${url}:`, error)
    return []
  }
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    Object.entries(RSS_FEEDS).map(([source, url]) =>
      fetchFeed(source as NewsSource, url)
    )
  )

  const items = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)

  // Log failed feeds
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const source = Object.keys(RSS_FEEDS)[i]
      console.error(`Failed to fetch ${source}:`, r.reason)
    }
  })

  // Deduplicate by normalized URL
  const seen = new Set<string>()
  const unique = items.filter(item => {
    const key = item.url.toLowerCase().split('?')[0]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Spam filtering already done in fetchFeed, so no need to filter again here
  // Sort newest first
  return unique.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}
