import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'

export function employeeOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.userType !== 'employee') {
    return next(createHttpError(403, 'Employee access only'))
  }
  next()
}



