/**
 * Legacy Cost Analytics Router
 * 
 * DEPRECATION NOTICE:
 * This router provides backward compatibility for /api/cost-analytics/* routes.
 * All requests are forwarded to the new /api/finance/* routes.
 * 
 * This router will be removed after the deprecation period.
 * Please migrate to /api/finance/analytics/* and /api/finance/budgets/*.
 */

import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'

export const legacyCostAnalyticsRouter = Router()

// All routes require authentication
legacyCostAnalyticsRouter.use(authenticate)

// View routes require at least COST_ANALYTICS_VIEW or FINANCE_VIEW permission
legacyCostAnalyticsRouter.use(requirePermission(
  PERMISSIONS.COST_ANALYTICS_VIEW,
  PERMISSIONS.COST_ANALYTICS_EDIT,
  PERMISSIONS.COST_ANALYTICS_FULL_ACCESS,
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_EDIT,
  PERMISSIONS.FINANCE_FULL_ACCESS
))

// Log deprecation warning for all requests
legacyCostAnalyticsRouter.use((req: Request, _res: Response, next: NextFunction) => {
  console.warn(`[DEPRECATION WARNING] /api/cost-analytics${req.path} is deprecated. Please migrate to /api/finance/analytics${req.path} or /api/finance/budgets/*`)
  next()
})

// Forward /api/cost-analytics/* to /api/finance/analytics/*
// Note: We use middleware forwarding to preserve the request method and body

// Live cost data
legacyCostAnalyticsRouter.get('/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { AnalyticsService } = await import('../analytics/analytics.service')
    const service = new AnalyticsService()
    const data = await service.getLiveCostData()
    res.json({ status: 'success', data })
  } catch (error) {
    next(error)
  }
})

// Cost summary
legacyCostAnalyticsRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { AnalyticsService } = await import('../analytics/analytics.service')
    const service = new AnalyticsService()
    
    let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
    let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()

    if (!req.query.startDate) {
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
    } else {
      startDate.setHours(0, 0, 0, 0)
    }
    
    if (!req.query.endDate) {
      endDate.setHours(23, 59, 59, 999)
    } else {
      endDate.setHours(23, 59, 59, 999)
    }

    const data = await service.getCostSummary(startDate, endDate)
    res.json({ status: 'success', data })
  } catch (error) {
    next(error)
  }
})

// Project list
legacyCostAnalyticsRouter.get('/projects', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { AnalyticsService } = await import('../analytics/analytics.service')
    const service = new AnalyticsService()
    const data = await service.getAllProjectNames()
    res.json({ status: 'success', data })
  } catch (error) {
    next(error)
  }
})

// Project detail
legacyCostAnalyticsRouter.get('/project/:projectName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { AnalyticsService } = await import('../analytics/analytics.service')
    const service = new AnalyticsService()
    
    const { projectName } = req.params
    if (!projectName) {
      return res.status(400).json({ status: 'error', message: 'Project name is required' })
    }

    let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
    let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()

    if (!req.query.startDate) {
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
    } else {
      startDate.setHours(0, 0, 0, 0)
    }
    
    if (!req.query.endDate) {
      endDate.setHours(23, 59, 59, 999)
    } else {
      endDate.setHours(23, 59, 59, 999)
    }

    const decodedProjectName = decodeURIComponent(projectName)
    const data = await service.getProjectDetail(decodedProjectName, startDate, endDate)
    
    if (!data) {
      return res.status(404).json({ status: 'error', message: 'No data found for this project' })
    }
    
    res.json({ status: 'success', data })
  } catch (error) {
    next(error)
  }
})

// Forecast
legacyCostAnalyticsRouter.get('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { AnalyticsService } = await import('../analytics/analytics.service')
    const service = new AnalyticsService()
    
    let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
    let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()
    const forecastDays = req.query.days ? parseInt(req.query.days as string, 10) : 30
    const project = req.query.project ? (req.query.project === 'null' ? null : req.query.project as string) : undefined

    if (!req.query.startDate) {
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
    } else {
      startDate.setHours(0, 0, 0, 0)
    }
    
    if (!req.query.endDate) {
      endDate.setHours(23, 59, 59, 999)
    } else {
      endDate.setHours(23, 59, 59, 999)
    }

    const data = await service.getCostForecast(startDate, endDate, forecastDays, project)
    res.json({ status: 'success', data })
  } catch (error) {
    next(error)
  }
})

// Period comparison
legacyCostAnalyticsRouter.get('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { AnalyticsService } = await import('../analytics/analytics.service')
    const service = new AnalyticsService()
    
    const currentStart = req.query.currentStart ? new Date(req.query.currentStart as string) : null
    const currentEnd = req.query.currentEnd ? new Date(req.query.currentEnd as string) : null
    const previousStart = req.query.previousStart ? new Date(req.query.previousStart as string) : null
    const previousEnd = req.query.previousEnd ? new Date(req.query.previousEnd as string) : null
    const project = req.query.project ? (req.query.project === 'null' ? null : req.query.project as string) : undefined

    if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
      return res.status(400).json({ status: 'error', message: 'All date parameters are required' })
    }

    currentStart.setHours(0, 0, 0, 0)
    currentEnd.setHours(23, 59, 59, 999)
    previousStart.setHours(0, 0, 0, 0)
    previousEnd.setHours(23, 59, 59, 999)

    const data = await service.getPeriodComparison(currentStart, currentEnd, previousStart, previousEnd, project)
    res.json({ status: 'success', data })
  } catch (error) {
    next(error)
  }
})

// Forward budget routes to the new finance budgets router
// These will be handled by the main app.ts router mounting
