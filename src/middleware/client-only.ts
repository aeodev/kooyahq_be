import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'
import { hasPermission, PERMISSIONS } from '../modules/auth/rbac/permissions'

export function clientOnly(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(createHttpError(401, 'Authentication required'))
  }

  const isClient =
    !hasPermission(req.user, PERMISSIONS.SYSTEM_FULL_ACCESS)

  if (!isClient) {
    return next(createHttpError(403, 'Client access only'))
  }

  next()
}
