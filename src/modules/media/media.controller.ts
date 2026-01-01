import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../utils/http-error'
import { buildMediaProxyUrl } from '../../utils/media-url'
import { getStorageObject, normalizeStoragePath } from '../../lib/storage'

export async function uploadMedia(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!file) {
    return next(createHttpError(400, 'File is required'))
  }

  try {
    const path = (file as any).storagePath || ''
    const url = path ? buildMediaProxyUrl(path) : ''

    if (!url) {
      return next(createHttpError(500, 'Failed to upload media'))
    }

    res.json({
      success: true,
      data: {
        url,
        path,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getMediaFile(req: Request, res: Response, next: NextFunction) {
  const rawPath = typeof req.query.path === 'string' ? req.query.path.trim() : ''

  if (!rawPath) {
    return next(createHttpError(400, 'path is required'))
  }

  if (rawPath.includes('..') || rawPath.includes('\\') || /^https?:\/\//i.test(rawPath)) {
    return next(createHttpError(400, 'Invalid path'))
  }

  const storagePath = normalizeStoragePath(rawPath)

  try {
    const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined
    const object = await getStorageObject(storagePath, rangeHeader)

    if (object.contentType) {
      res.setHeader('Content-Type', object.contentType)
    }
    if (object.contentLength !== undefined) {
      res.setHeader('Content-Length', object.contentLength.toString())
    }
    if (object.contentRange) {
      res.setHeader('Content-Range', object.contentRange)
    }
    if (object.acceptRanges) {
      res.setHeader('Accept-Ranges', object.acceptRanges)
    }
    res.setHeader('Cache-Control', object.cacheControl || 'public, max-age=31536000, immutable')

    if (rangeHeader || object.contentRange) {
      res.status(206)
    }

    object.stream.on('error', (error) => {
      next(error)
    })
    object.stream.pipe(res)
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404) {
      return next(createHttpError(404, 'File not found'))
    }
    next(error)
  }
}
