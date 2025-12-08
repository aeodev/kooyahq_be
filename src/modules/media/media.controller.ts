import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../utils/http-error'
import { authenticate } from '../../middleware/authenticate'

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
    const url = (file as any).cloudinaryUrl || ''
    const publicId = (file as any).cloudinaryPublicId || ''

    if (!url) {
      return next(createHttpError(500, 'Failed to upload media'))
    }

    res.json({
      success: true,
      data: {
        url,
        publicId,
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

