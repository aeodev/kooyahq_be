import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../../utils/http-error'

/**
 * Helper to extract user ID from request
 */
export function getUserId(req: Request): string | undefined {
  return req.user?.id
}

/**
 * Helper to require authentication
 */
export function requireAuth(req: Request, next: NextFunction): string | null {
  const userId = getUserId(req)
  if (!userId) {
    next(createHttpError(401, 'Unauthorized'))
    return null
  }
  return userId
}

/**
 * Helper to create standardized API response
 */
export function sendResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string,
) {
  const response: any = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
  if (message) {
    response.message = message
  }
  return res.status(statusCode).json(response)
}

/**
 * Helper to handle controller errors
 */
export function handleControllerError(
  error: any,
  next: NextFunction,
  defaultMessage: string = 'An error occurred',
) {
  if (error.message.includes('not a member') || error.message.includes('permission')) {
    return next(createHttpError(403, error.message))
  }
  if (error.message.includes('not found')) {
    return next(createHttpError(404, error.message))
  }
  next(createHttpError(500, error.message || defaultMessage))
}

/**
 * Helper to validate required query parameters
 */
export function validateQueryParam(
  req: Request,
  paramName: string,
  next: NextFunction,
): string | null {
  const value = req.query[paramName]
  if (!value || typeof value !== 'string') {
    next(createHttpError(400, `${paramName} is required`))
    return null
  }
  return value
}

/**
 * Helper to validate required body fields
 */
export function validateBodyField(
  req: Request,
  fieldName: string,
  next: NextFunction,
): any {
  const value = req.body[fieldName]
  if (!value) {
    next(createHttpError(400, `${fieldName} is required`))
    return null
  }
  return value
}



