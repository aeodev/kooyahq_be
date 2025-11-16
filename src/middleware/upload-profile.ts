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

export const uploadProfile = {
  fields: (fields: Array<{ name: string; maxCount?: number }>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      multerUpload.fields(fields)(req, res, async (err) => {
        if (err) return next(err)
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
        if (files) {
          try {
            const uploadPromises: Promise<void>[] = []
            for (const field of fields) {
              const fieldFiles = files[field.name]
              if (fieldFiles) {
                for (const file of fieldFiles) {
                  uploadPromises.push(
                    uploadToCloudinary(file.buffer, 'profiles').then((result) => {
                      ;(file as any).cloudinaryUrl = result.secureUrl
                      ;(file as any).cloudinaryPublicId = result.publicId
                    })
                  )
                }
              }
            }
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








