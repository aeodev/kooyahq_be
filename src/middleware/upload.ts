import multer from 'multer'
import { createHttpError } from '../utils/http-error'
import type { Request, Response, NextFunction } from 'express'
import { uploadToCloudinary } from '../utils/cloudinary'

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

export const upload = {
  single: (fieldName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err)
        if (req.file) {
          try {
            const result = await uploadToCloudinary(req.file.buffer, 'gallery')
            ;(req.file as any).cloudinaryUrl = result.secureUrl
            ;(req.file as any).cloudinaryPublicId = result.publicId
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload image to Cloudinary'))
          }
        }
        next()
      })
    }
  },
  array: (fieldName: string, maxCount?: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      multerUpload.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return next(err)
        if (req.files && Array.isArray(req.files)) {
          try {
            const uploadPromises = req.files.map(async (file) => {
              const result = await uploadToCloudinary(file.buffer, 'gallery')
              ;(file as any).cloudinaryUrl = result.secureUrl
              ;(file as any).cloudinaryPublicId = result.publicId
            })
            await Promise.all(uploadPromises)
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload images to Cloudinary'))
          }
        }
        next()
      })
    }
  },
}

