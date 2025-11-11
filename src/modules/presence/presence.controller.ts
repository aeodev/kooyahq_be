import type { NextFunction, Request, Response } from 'express'
import { presenceManager } from './presence.manager'

export async function getPresenceSnapshot(_req: Request, res: Response, next: NextFunction) {
  try {
    const snapshot = await presenceManager.getSnapshot()
    res.json({
      status: 'success',
      data: snapshot,
    })
  } catch (error) {
    next(error)
  }
}

