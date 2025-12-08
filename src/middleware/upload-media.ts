import multer from 'multer'
import { createHttpError } from '../utils/http-error'
import type { Request, Response, NextFunction } from 'express'
import { uploadToCloudinary } from '../utils/cloudinary'

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
            // Determine resource type based on mimetype
            const isVideo = req.file.mimetype.startsWith('video/')
            const folder = 'rich-text-media'
            
            const result = await uploadToCloudinary(
              req.file.buffer,
              folder,
              undefined,
              isVideo ? 'video' : 'image'
            )
            ;(req.file as any).cloudinaryUrl = result.secureUrl
            ;(req.file as any).cloudinaryPublicId = result.publicId
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload media to Cloudinary'))
          }
        }
        next()
      })
    }
  },
}

