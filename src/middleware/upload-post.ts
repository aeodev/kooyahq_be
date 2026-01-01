import multer from 'multer'
import { createHttpError } from '../utils/http-error'
import type { Request, Response, NextFunction } from 'express'
import { uploadBufferToStorage } from '../lib/storage'

const storage = multer.memoryStorage()

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(createHttpError(400, 'Invalid file type. Only images are allowed.') as any)
  }
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
})

export const uploadPost = {
  single: (fieldName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err)
        if (req.file) {
          try {
            const result = await uploadBufferToStorage({
              buffer: req.file.buffer,
              contentType: req.file.mimetype,
              folder: 'posts',
              originalName: req.file.originalname,
            })
            ;(req.file as any).storagePath = result.path
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload image'))
          }
        }
        next()
      })
    }
  },
}






