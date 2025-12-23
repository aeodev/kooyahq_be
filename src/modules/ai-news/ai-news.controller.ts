import { Request, Response } from 'express'
import { fetchAllNews } from './ai-news.service'
import { HttpError } from '../../utils/http-error'
import {
  getCachedQuery,
  setCachedQuery,
  clearCache,
} from './ai-news.cache'
import { isSpam } from '../../utils/spam-filter.utils'
import { isGifUrl } from '../../utils/image.utils'
import type { NewsItem, NewsFilter, NewsResponse } from './ai-news.types'
import { NewsItemModel } from './ai-news.model'
import { SocketEmitter } from '../../utils/socket-emitter'
import { aiNewsRoom } from '../../utils/socket-rooms'

// Validate that a news item has all required fields and is complete
function isValidNewsItem(item: any): item is NewsItem {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.type === 'news' &&
    typeof item.title === 'string' &&
    item.title.trim().length > 0 &&
    typeof item.content === 'string' &&
    item.content.trim().length > 0 &&
    typeof item.source === 'string' &&
    typeof item.url === 'string' &&
    item.url.length > 0 &&
    typeof item.publishedAt === 'string' &&
    item.publishedAt.length > 0 &&
    (!item.imageUrl || (typeof item.imageUrl === 'string' && item.imageUrl.length > 0))
  )
}

// Filter and validate items, ensuring only complete items are returned
function validateAndFilterItems(items: any[]): NewsItem[] {
  return items
    .filter(isValidNewsItem)
    .map((item) => ({
      id: item.id.trim(),
      type: 'news' as const,
      title: item.title.trim(),
      content: item.content.trim(),
      author: item.author?.trim() || undefined,
      source: item.source,
      url: item.url.trim(),
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl?.trim() || undefined,
    }))
}

async function queryMongoDB(
  filter: NewsFilter,
  offset: number,
  limit: number
): Promise<NewsItem[]> {
  const query: any = {}
  if (filter !== 'all' && filter !== 'news') {
    query.source = filter
  }

  // Query more items than needed to account for filtering out invalid ones
  const items = await NewsItemModel.find(query)
    .sort({ publishedAt: -1 })
    .skip(offset)
    .limit(limit * 2) // Fetch extra to account for invalid items
    .lean()

  const mappedItems = items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    content: item.content,
    author: item.author,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt.toISOString(),
    imageUrl: item.imageUrl,
  }))

  // Validate and filter items, then take only the requested limit
  const validItems = validateAndFilterItems(mappedItems)
  return validItems.slice(0, limit)
}

async function countMongoDB(filter: NewsFilter): Promise<number> {
  const query: any = {}
  if (filter !== 'all' && filter !== 'news') {
    query.source = filter
  }

  return NewsItemModel.countDocuments(query)
}

export async function getAINews(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
    const filter = (req.query.filter as NewsFilter) || 'all'

    // Check Redis cache first (fast path)
    const cachedResponse = await getCachedQuery<NewsResponse>(
      filter,
      offset,
      limit
    )

    if (cachedResponse) {
      // Validate cached response before returning
      if (
        cachedResponse.status === 'success' &&
        Array.isArray(cachedResponse.data) &&
        cachedResponse.data.every(isValidNewsItem)
      ) {
        return res.json(cachedResponse)
      }
      // If cached response is invalid, continue to fetch fresh data
    }

    // Cache miss - check if MongoDB has data
    let totalInDB = 0
    try {
      totalInDB = await NewsItemModel.countDocuments()
    } catch (error) {
      console.error('Error checking MongoDB count:', error)
      // If MongoDB query fails, try fetching from RSS feeds
      totalInDB = 0
    }
    
    let paginatedItems: NewsItem[]
    let total: number

    if (totalInDB === 0) {
      // MongoDB is empty or query failed - fetch from RSS feeds
      console.log('MongoDB empty or unavailable, fetching from RSS feeds...')
      try {
        const allItems = await fetchAllNews()
        console.log(`Fetched ${allItems.length} items from RSS feeds`)
        
        if (allItems.length === 0) {
          // Still empty after fetch - return empty response
          return res.json({
            status: 'success',
            data: [],
            hasMore: false,
            total: 0,
            filter,
          })
        }
        
        const filteredItems = filter === 'all' 
          ? allItems 
          : filter === 'news'
          ? allItems.filter(item => item.type === 'news')
          : allItems.filter(item => item.source === filter)
        
        // Validate items before pagination to ensure only complete items are returned
        const validItems = validateAndFilterItems(filteredItems)
        paginatedItems = validItems.slice(offset, offset + limit)
        total = validItems.length
      } catch (error) {
        console.error('Error fetching RSS feeds:', error)
        throw new HttpError(500, 'Failed to fetch news from RSS feeds')
      }
    } else {
      // MongoDB has data - query it
      paginatedItems = await queryMongoDB(filter, offset, limit)
      total = await countMongoDB(filter)
    }

    // Filter GIFs from results and ensure all items are still valid after processing
    const itemsWithGifsRemoved = paginatedItems
      .map((item) => {
        if (item.imageUrl && isGifUrl(item.imageUrl)) {
          return { ...item, imageUrl: undefined }
        }
        return item
      })
      .filter(isValidNewsItem) // Final validation pass

    // Calculate hasMore based on whether we got fewer items than requested
    // If we got fewer items than requested, we've reached the end
    // Also check if we're at or past the total count
    const hasMore = itemsWithGifsRemoved.length === limit && offset + itemsWithGifsRemoved.length < total

    const response: NewsResponse = {
      status: 'success',
      data: itemsWithGifsRemoved,
      hasMore,
      total,
      filter,
    }

    // Cache the response
    await setCachedQuery(filter, offset, limit, response)

    res.json(response)
  } catch (error) {
    console.error('Error fetching AI news:', error)
    throw new HttpError(500, 'Failed to fetch AI news')
  }
}

export async function refreshAINews(req: Request, res: Response) {
  try {
    // Clear cache first
    await clearCache()

    // Get existing items from MongoDB to compare
    const existingItems = await NewsItemModel.find()
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean()
    const existingUrls = new Set(existingItems.map((item) => item.url))

    // Fetch all news (saves to MongoDB)
    const allItems = await fetchAllNews()

    // Find new items (items not in existing set)
    const newItems = allItems.filter((item) => !existingUrls.has(item.url))

    // Emit Socket.IO event for new items
    if (newItems.length > 0) {
      SocketEmitter.emitToRoom(aiNewsRoom(), 'ai-news:new-items', {
        items: newItems.slice(0, 10), // Limit to 10 most recent
      })
    }

    res.json({
      status: 'success',
      message: 'Cache refreshed',
      total: allItems.length,
      newItems: newItems.length,
    })
  } catch (error) {
    console.error('Error refreshing AI news:', error)
    throw new HttpError(500, 'Failed to refresh AI news')
  }
}
