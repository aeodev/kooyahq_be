import { Request, Response } from 'express'
import { fetchLinkPreview } from './link-preview.service'
import { HttpError } from '../../utils/http-error'

export async function getLinkPreview(req: Request, res: Response) {
  try {
    const url = req.query.url as string
    
    if (!url) {
      throw new HttpError(400, 'URL parameter is required')
    }
    
    // Validate URL
    try {
      new URL(url)
    } catch {
      throw new HttpError(400, 'Invalid URL format')
    }
    
    const preview = await fetchLinkPreview(url, {
      timeout: 10000,
      followRedirects: true,
      maxRedirects: 5,
    })
    
    res.json({
      status: 'success',
      data: preview,
    })
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    console.error('Error fetching link preview:', error)
    throw new HttpError(500, 'Failed to fetch link preview')
  }
}
