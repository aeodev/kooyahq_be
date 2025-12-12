import type { AuthUser, Permission } from '../modules/auth/rbac/permissions'

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      file?: Express.Multer.File
      files?: Express.Multer.File[]
      auth?: {
        user: AuthUser
        permissions: Permission[]
      }
    }
  }
}

export {}
