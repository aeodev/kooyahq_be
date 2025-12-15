import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env'
import { createHttpError } from '../../utils/http-error'

function getHeaderValue(req: Request, headerName: string): string | undefined {
  const value = req.headers[headerName]
  if (Array.isArray(value)) {
    return value[0]
  }
  return value as string | undefined
}

export function verifyGithubGatewaySecret(req: Request, _res: Response, next: NextFunction) {
  const configuredSecret = env.gateways.github.secret

  if (!configuredSecret) {
    return next(createHttpError(503, 'GitHub gateway secret is not configured'))
  }

  const providedSecret =
    getHeaderValue(req, 'x-github-gateway-secret') ||
    getHeaderValue(req, 'x-gateway-secret') ||
    (() => {
      const authHeader = getHeaderValue(req, 'authorization')
      if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim()
      }
      return undefined
    })()

  if (!providedSecret) {
    return next(createHttpError(401, 'Gateway secret missing'))
  }

  if (providedSecret !== configuredSecret) {
    return next(createHttpError(401, 'Invalid gateway secret'))
  }

  return next()
}
