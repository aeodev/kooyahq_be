import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../utils/http-error'

export function clientOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.userType !== 'client') {
    return next(createHttpError(403, 'Client access only'))
  }
  next()
}



