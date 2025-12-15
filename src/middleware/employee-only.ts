import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'
import { hasPermission, PERMISSIONS } from '../modules/auth/rbac/permissions'

export function employeeOnly(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(createHttpError(401, 'Authentication required'))
  }

  const isEmployee = hasPermission(req.user, PERMISSIONS.SYSTEM_FULL_ACCESS)

  if (!isEmployee) {
    return next(createHttpError(403, 'Employee access only'))
  }

  next()
}
