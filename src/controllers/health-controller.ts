import type { Request, Response } from 'express'
import { env } from '../config/env'
import { createHealthSnapshot } from '../utils/health-snapshot'

export function getHealth(_req: Request, res: Response) {
  const snapshot = createHealthSnapshot()

  res.json({
    status: 'ok',
    environment: env.nodeEnv,
    ...snapshot,
  })
}
