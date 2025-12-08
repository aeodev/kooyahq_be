import { Request, Response } from 'express'
import { fetchAllNews } from './ai-news.service'
import { HttpError } from '../../utils/http-error'
import { getCached, setCached, clearCache, CACHE_KEY } from './ai-news.cache'
import { fetchImageFromUrl } from '../link-preview/link-preview.service'
import { isSpam } from '../../utils/spam-filter.utils'
import { isGifUrl } from '../../utils/image.utils'
import type { NewsItem, NewsFilter, NewsResponse } from './ai-news.types'

// Request deduplication: track pending fetchAllNews calls
const pendingFetches = new Map<string, Promise<NewsItem[]>>()

function filterItems(items: NewsItem[], filter: NewsFilter): NewsItem[] {
  if (filter === 'all') return items
  if (filter === 'news') return items.filter(item => item.type === 'news')
  return items.filter(item => item.source === filter)
}

export async function getAINews(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
    const filter = (req.query.filter as NewsFilter) || 'all'

    // Check cache with deduplication
    let allItems = await getCached<NewsItem[]>(CACHE_KEY)

    // Await fetch on cache miss - don't return empty
    if (!allItems || allItems.length === 0) {
      // Check if fetch is already in progress
      const fetchKey = 'fetch-all-news'
      let fetchPromise = pendingFetches.get(fetchKey)
      
      if (!fetchPromise) {
        fetchPromise = fetchAllNews()
        pendingFetches.set(fetchKey, fetchPromise)
        
        // Clean up after fetch completes
        fetchPromise
          .then((items) => {
            pendingFetches.delete(fetchKey)
            return items
          })
          .catch(() => {
            pendingFetches.delete(fetchKey)
          })
      }
      
      allItems = await fetchPromise
      await setCached(CACHE_KEY, allItems)
    }

    // Filter spam from cached data (in case cache contains old spam)
    let spamFiltered = allItems.filter(item => {
      const spam = isSpam(item.title, item.content, item.url)
      if (spam) {
        console.log(`Controller filtered spam from cache: ${item.title} (${item.url})`)
      }
      return !spam
    })

    // Filter out GIF images from cached items (clean up old cached GIFs)
    const itemsWithGifsRemoved = spamFiltered.map(item => {
      if (item.imageUrl && isGifUrl(item.imageUrl)) {
        console.log(`Controller filtered GIF from cache: ${item.imageUrl}`)
        return { ...item, imageUrl: undefined }
      }
      return item
    })

    // Update cache with filtered data if spam or GIFs were found
    const hasChanges = itemsWithGifsRemoved.length !== allItems.length || 
      itemsWithGifsRemoved.some((item, i) => item.imageUrl !== spamFiltered[i]?.imageUrl)
    
    if (hasChanges) {
      spamFiltered = itemsWithGifsRemoved
      await setCached(CACHE_KEY, spamFiltered)
    }

    const filteredItems = filterItems(spamFiltered, filter)
    const paginatedItems = filteredItems.slice(offset, offset + limit)

    // Don't fetch images synchronously - let frontend handle it
    // This prevents blocking and layout shifts

    const response: NewsResponse = {
      status: 'success',
      data: paginatedItems,
      hasMore: offset + limit < filteredItems.length,
      total: filteredItems.length,
      filter,
    }

    res.json(response)
    
    // Fetch images in background (non-blocking) for cache
    // Skip Reddit sources - they should never have images
    if (paginatedItems.some(item => !item.imageUrl && item.source !== 'reddit' && item.source !== 'reddit-artificial')) {
      Promise.allSettled(
        paginatedItems
          .filter(item => !item.imageUrl && item.source !== 'reddit' && item.source !== 'reddit-artificial')
          .slice(0, 10) // Limit to first 10 to avoid overload
          .map(async (item) => {
            try {
              const imageUrl = await fetchImageFromUrl(item.url)
              // Final validation: ensure it's not a GIF before assigning
              if (imageUrl && !isGifUrl(imageUrl)) {
                item.imageUrl = imageUrl
                const fullItem = spamFiltered.find(i => i.id === item.id)
                if (fullItem) {
                  fullItem.imageUrl = imageUrl
                  await setCached(CACHE_KEY, spamFiltered)
                }
              }
            } catch {
              // Silent fail - background process
            }
          })
      ).catch(() => {})
    }
  } catch (error) {
    console.error('Error fetching AI news:', error)
    throw new HttpError(500, 'Failed to fetch AI news')
  }
}

export async function refreshAINews(req: Request, res: Response) {
  try {
    await clearCache()
    const allItems = await fetchAllNews()
    await setCached(CACHE_KEY, allItems)

    res.json({
      status: 'success',
      message: 'Cache refreshed',
      total: allItems.length,
    })
  } catch (error) {
    console.error('Error refreshing AI news:', error)
    throw new HttpError(500, 'Failed to refresh AI news')
  }
}
