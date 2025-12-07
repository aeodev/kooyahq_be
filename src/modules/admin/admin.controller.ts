import type { NextFunction, Request, Response } from 'express'
import { adminService } from './admin.service'

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getStats()
    res.json({
      status: 'success',
      data: stats,
    })
  } catch (error) {
    next(error)
  }
}

export async function exportUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { format } = req.query
    const formatType = format === 'json' ? 'json' : 'csv'

    const result = await adminService.exportUsers(formatType)

    if (formatType === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=users.json')
      res.json({
        status: 'success',
        data: result,
      })
    } else {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv')
      res.send(result)
    }
  } catch (error) {
    next(error)
  }
}







