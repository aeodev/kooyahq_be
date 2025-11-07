import multer from 'multer'
import { env } from '../config/env'
import { createHttpError } from '../utils/http-error'
import type { Request } from 'express'
import { mkdirSync } from 'fs'
import { join } from 'path'

const uploadDir = env.uploadDir
mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = file.originalname.split('.').pop()
    cb(null, `post-${uniqueSuffix}.${ext}`)
  },
})

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(createHttpError(400, 'Invalid file type. Only images are allowed.') as any)
  }
}

export const uploadPost = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
})







