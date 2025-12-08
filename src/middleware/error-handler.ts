import type { ErrorRequestHandler } from 'express'

type HttpError = Error & { statusCode?: number }

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const { statusCode = 500, message } = error as HttpError

  // Match the response format used in board controllers (success/error pattern)
  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode === 409 ? 'CONFLICT' : statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
      message,
    },
    timestamp: new Date().toISOString(),
  })
}
