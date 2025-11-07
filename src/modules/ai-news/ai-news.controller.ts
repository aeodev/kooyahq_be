import { Request, Response } from 'express'
import { fetchNewsFeeds, fetchTweets } from './ai-news.service'
import { HttpError } from '../../utils/http-error'

export async function getAINews(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const [newsItems, tweets] = await Promise.all([
      fetchNewsFeeds(),
      fetchTweets(),
    ])

    const allItems = [...newsItems, ...tweets].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )

    const paginatedItems = allItems.slice(offset, offset + limit)
    const hasMore = offset + limit < allItems.length

    res.json({
      status: 'success',
      data: paginatedItems,
      hasMore,
      total: allItems.length,
    })
  } catch (error) {
    console.error('Error fetching AI news:', error)
    throw new HttpError(500, 'Failed to fetch AI news')
  }
}

