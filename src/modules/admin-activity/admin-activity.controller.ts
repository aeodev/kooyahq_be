import type { NextFunction, Request, Response } from 'express'
import { adminActivityService } from './admin-activity.service'

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { limit, startDate, endDate, action } = req.query

    const activities = await adminActivityService.getActivity({
      limit: limit ? parseInt(limit as string, 10) : 100,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      action: action as string | undefined,
    })

    res.json({
      status: 'success',
      data: activities,
    })
  } catch (error) {
    next(error)
  }
}








