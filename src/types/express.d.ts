import type { PublicUser } from '../modules/users/user.model'

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
      file?: Express.Multer.File
      files?: Express.Multer.File[]
    }
  }
}

export {}
