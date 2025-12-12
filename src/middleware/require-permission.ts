import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'
import { hasPermission, type Permission } from '../modules/auth/rbac/permissions'

export function requirePermission(...required: Permission[]) {
  return function permissionGuard(req: Request, _res: Response, next: NextFunction) {
    if (!req.user) {
      return next(createHttpError(401, 'Authentication required'))
    }

    const allowed = required.some((perm) => hasPermission(req.user!, perm))
    if (!allowed) {
      return next(createHttpError(403, 'Forbidden'))
    }

    return next()
  }
}
