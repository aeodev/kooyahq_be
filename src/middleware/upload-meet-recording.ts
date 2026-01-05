import multer from 'multer'
import { createHttpError } from '../utils/http-error'
import type { Request, Response, NextFunction } from 'express'
import { uploadBufferToStorage } from '../lib/storage'

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
            const result = await uploadBufferToStorage({
              buffer: req.file.buffer,
              contentType: req.file.mimetype,
              folder: 'meet-recordings',
              originalName: req.file.originalname,
            })
            ;(req.file as any).storagePath = result.path
          } catch (error) {
            return next(createHttpError(500, 'Failed to upload recording'))
          }
        }
        next()
      })
    }
  },
}

