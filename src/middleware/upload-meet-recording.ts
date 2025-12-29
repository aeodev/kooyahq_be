import multer from 'multer'
import { createHttpError } from '../utils/http-error'
import type { Request, Response, NextFunction } from 'express'
import { uploadToCloudinary } from '../utils/cloudinary'

const storage = multer.memoryStorage()

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow video files
  const allowedMimes = [
    'video/webm',
    'video/mp4',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo', // .avi
  ]
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(createHttpError(400, 'Invalid file type. Only video files are allowed.') as any)
  }
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size for recordings
  },
})

export const uploadMeetRecording = {
  single: (fieldName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err)
        if (req.file) {
          try {
            const result = await uploadToCloudinary(
              req.file.buffer,
              'meet-recordings',
              undefined,
              'video'
            )
            ;(req.file as any).cloudinaryUrl = result.secureUrl
            ;(req.file as any).cloudinaryPublicId = result.publicId
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload recording to Cloudinary'))
          }
        }
        next()
      })
    }
  },
}

