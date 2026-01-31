/**
 * Analytics Controller
 * 
 * SECURITY CRITICAL:
 * - Default endpoints return SAFE (sanitized) data without monthlySalary/hourlyRate
 * - Privileged endpoints require SYSTEM_FULL_ACCESS and return full data
 * 
 * The router layer enforces permission checks for privileged routes.
 */

import { Request, Response } from 'express'
import { AnalyticsService } from './analytics.service'

const service = new AnalyticsService()

// ============================================================================
// SAFE (DEFAULT) ENDPOINTS - No salary/rate exposure
// ============================================================================

export async function getLiveCost(_req: Request, res: Response) {
  try {
    const data = await service.getLiveCostData()
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get live cost data'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getCostSummary(req: Request, res: Response) {
  try {
    let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
    let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()

    // Default to last 30 days if no dates provided
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid date format' })
    }

    if (startDate > endDate) {
      return res.status(400).json({ status: 'error', message: 'Start date must be before end date' })
    }

    const data = await service.getCostSummary(startDate, endDate)
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get cost summary'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getProjectDetail(req: Request, res: Response) {
  try {
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid date format' })
    }

    const decodedProjectName = decodeURIComponent(projectName)
    const data = await service.getProjectDetail(decodedProjectName, startDate, endDate)
    
    if (!data) {
      return res.status(404).json({ status: 'error', message: 'No data found for this project' })
    }
    
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get project detail'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getProjectList(_req: Request, res: Response) {
  try {
    const data = await service.getAllProjectNames()
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get project list'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getCostForecast(req: Request, res: Response) {
  try {
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid date format' })
    }

    if (startDate > endDate) {
      return res.status(400).json({ status: 'error', message: 'Start date must be before end date' })
    }

    if (forecastDays <= 0 || forecastDays > 365) {
      return res.status(400).json({ status: 'error', message: 'Forecast days must be between 1 and 365' })
    }

    const data = await service.getCostForecast(startDate, endDate, forecastDays, project)
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate forecast'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getPeriodComparison(req: Request, res: Response) {
  try {
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

    if (
      isNaN(currentStart.getTime()) ||
      isNaN(currentEnd.getTime()) ||
      isNaN(previousStart.getTime()) ||
      isNaN(previousEnd.getTime())
    ) {
      return res.status(400).json({ status: 'error', message: 'Invalid date format' })
    }

    if (currentStart > currentEnd || previousStart > previousEnd) {
      return res.status(400).json({ status: 'error', message: 'Start date must be before end date' })
    }

    const data = await service.getPeriodComparison(currentStart, currentEnd, previousStart, previousEnd, project)
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compare periods'
    res.status(500).json({ status: 'error', message })
  }
}

// ============================================================================
// PRIVILEGED ENDPOINTS - Require SYSTEM_FULL_ACCESS
// Include salary/rate data - router MUST enforce permission check
// ============================================================================

/**
 * Get live cost data with FULL salary/rate information
 * SECURITY: Router must verify SYSTEM_FULL_ACCESS
 */
export async function getLiveCostPrivileged(_req: Request, res: Response) {
  try {
    const data = await service.getLiveCostDataPrivileged()
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get privileged live cost data'
    res.status(500).json({ status: 'error', message })
  }
}

/**
 * Get cost summary with FULL salary/rate information
 * SECURITY: Router must verify SYSTEM_FULL_ACCESS
 */
export async function getCostSummaryPrivileged(req: Request, res: Response) {
  try {
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid date format' })
    }

    if (startDate > endDate) {
      return res.status(400).json({ status: 'error', message: 'Start date must be before end date' })
    }

    const data = await service.getCostSummaryPrivileged(startDate, endDate)
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get privileged cost summary'
    res.status(500).json({ status: 'error', message })
  }
}

/**
 * Get project detail with FULL salary/rate information
 * SECURITY: Router must verify SYSTEM_FULL_ACCESS
 */
export async function getProjectDetailPrivileged(req: Request, res: Response) {
  try {
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

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Invalid date format' })
    }

    const decodedProjectName = decodeURIComponent(projectName)
    const data = await service.getProjectDetailPrivileged(decodedProjectName, startDate, endDate)
    
    if (!data) {
      return res.status(404).json({ status: 'error', message: 'No data found for this project' })
    }
    
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get privileged project detail'
    res.status(500).json({ status: 'error', message })
  }
}
