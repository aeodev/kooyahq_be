import { Request, Response } from 'express'
import { fetchAllNews } from './ai-news.service'
import { HttpError } from '../../utils/http-error'
import { getCached, setCached, clearCache, CACHE_KEY } from './ai-news.cache'
import type { NewsItem, NewsFilter, NewsResponse } from './ai-news.types'

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

    let allItems = await getCached<NewsItem[]>(CACHE_KEY)

    // Await fetch on cache miss - don't return empty
    if (!allItems || allItems.length === 0) {
      allItems = await fetchAllNews()
      setCached(CACHE_KEY, allItems).catch(console.error)
    }

    const filteredItems = filterItems(allItems, filter)
    const paginatedItems = filteredItems.slice(offset, offset + limit)

    const response: NewsResponse = {
      status: 'success',
      data: paginatedItems,
      hasMore: offset + limit < filteredItems.length,
      total: filteredItems.length,
      filter,
    }

    res.json(response)
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
