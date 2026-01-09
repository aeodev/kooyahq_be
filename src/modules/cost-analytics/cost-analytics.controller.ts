import { Request, Response } from 'express'
import { CostAnalyticsService } from './cost-analytics.service'

const service = new CostAnalyticsService()

export async function getLiveCost(_req: Request, res: Response) {
  const data = await service.getLiveCostData()
  res.json({ status: 'success', data })
}

export async function getCostSummary(req: Request, res: Response) {
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
}

export async function getProjectDetail(req: Request, res: Response) {
  const { projectName } = req.params
  
  if (!projectName) {
    return res.status(400).json({ status: 'error', message: 'Project name is required' })
  }

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

  const decodedProjectName = decodeURIComponent(projectName)
  const data = await service.getProjectDetail(decodedProjectName, startDate, endDate)
  
  if (!data) {
    return res.status(404).json({ status: 'error', message: 'No data found for this project' })
  }
  
  res.json({ status: 'success', data })
}

export async function getProjectList(_req: Request, res: Response) {
  const data = await service.getAllProjectNames()
  res.json({ status: 'success', data })
}

export async function getCostForecast(req: Request, res: Response) {
  let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
  let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()
  const forecastDays = req.query.days ? parseInt(req.query.days as string, 10) : 30
  const project = req.query.project ? (req.query.project === 'null' ? null : req.query.project as string) : undefined

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

  if (forecastDays <= 0 || forecastDays > 365) {
    return res.status(400).json({ status: 'error', message: 'Forecast days must be between 1 and 365' })
  }

  try {
    const data = await service.getCostForecast(startDate, endDate, forecastDays, project)
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate forecast'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getPeriodComparison(req: Request, res: Response) {
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

  try {
    const data = await service.getPeriodComparison(currentStart, currentEnd, previousStart, previousEnd, project)
    res.json({ status: 'success', data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compare periods'
    res.status(500).json({ status: 'error', message })
  }
}
