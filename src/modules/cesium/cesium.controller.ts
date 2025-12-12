import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env'
import { createHttpError } from '../../utils/http-error'

export async function getCesiumIonToken(_req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.cesium.ionToken) {
      return next(createHttpError(404, 'Cesium is not configured'))
    }

    res.json({
      status: 'success',
      data: {
        token: env.cesium.ionToken,
      },
    })
  } catch (error) {
    next(error)
  }
}
