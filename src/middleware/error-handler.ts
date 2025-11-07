import type { ErrorRequestHandler } from 'express'

type HttpError = Error & { statusCode?: number }

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const { statusCode = 500, message } = error as HttpError

  res.status(statusCode).json({
    status: 'error',
    message,
  })
}
