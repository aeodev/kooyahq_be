import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(createHttpError(401, 'Authentication required'))
  }

  if (!req.user.isAdmin) {
    return next(createHttpError(403, 'Admin access required'))
  }

  return next()
}

