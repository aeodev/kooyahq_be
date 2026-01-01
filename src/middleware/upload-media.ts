import multer from 'multer'
import { createHttpError } from '../utils/http-error'
import type { Request, Response, NextFunction } from 'express'
import { uploadBufferToStorage } from '../lib/storage'

const storage = multer.memoryStorage()

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and videos
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo', // .avi
  ]
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(createHttpError(400, 'Invalid file type. Only images and videos are allowed.') as any)
  }
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size (for videos)
  },
})

export const uploadMedia = {
  single: (fieldName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err)
        if (req.file) {
          try {
            const folder = 'rich-text-media'
            
            const result = await uploadBufferToStorage({
              buffer: req.file.buffer,
              contentType: req.file.mimetype,
              folder,
              originalName: req.file.originalname,
            })
            ;(req.file as any).storagePath = result.path
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload media'))
          }
        }
        next()
      })
    }
  },
}

