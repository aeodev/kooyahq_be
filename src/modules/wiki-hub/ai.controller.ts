import type { NextFunction, Request, Response } from 'express'
import { aiService } from './ai.service'
import { pageService } from './page.service'
import { searchService } from './search.service'
import { createHttpError } from '../../utils/http-error'

export async function summarizePage(req: Request, res: Response, next: NextFunction) {
  const { pageId } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!pageId) {
    return next(createHttpError(400, 'Page ID is required'))
  }

  try {
    const page = await pageService.getPage(pageId, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const summary = await aiService.summarizePage(page.content)

    res.json({
      success: true,
      data: { summary },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    if (error.message.includes('Failed to summarize')) {
      return next(createHttpError(500, error.message))
    }
    next(error)
  }
}

export async function extractActionItems(req: Request, res: Response, next: NextFunction) {
  const { pageId } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!pageId) {
    return next(createHttpError(400, 'Page ID is required'))
  }

  try {
    const page = await pageService.getPage(pageId, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const actionItems = await aiService.extractActionItems(page.content)

    res.json({
      success: true,
      data: { actionItems },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function suggestImprovements(req: Request, res: Response, next: NextFunction) {
  const { pageId } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!pageId) {
    return next(createHttpError(400, 'Page ID is required'))
  }

  try {
    const page = await pageService.getPage(pageId, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const suggestions = await aiService.suggestImprovements(page.content)

    res.json({
      success: true,
      data: { suggestions },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function convertToSOP(req: Request, res: Response, next: NextFunction) {
  const { pageId } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!pageId) {
    return next(createHttpError(400, 'Page ID is required'))
  }

  try {
    const page = await pageService.getPage(pageId, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const sopContent = await aiService.convertToSOP(page.content)

    res.json({
      success: true,
      data: { content: sopContent },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    if (error.message.includes('Failed to convert')) {
      return next(createHttpError(500, error.message))
    }
    next(error)
  }
}

export async function semanticSearch(req: Request, res: Response, next: NextFunction) {
  const { workspaceId, query } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!workspaceId || !query) {
    return next(createHttpError(400, 'Workspace ID and query are required'))
  }

  try {
    const pages = await searchService.semanticSearch(query, workspaceId)

    res.json({
      success: true,
      data: pages,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
