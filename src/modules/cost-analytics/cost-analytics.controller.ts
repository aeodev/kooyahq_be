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
