import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getLiveCost, getCostSummary, getProjectDetail, getProjectList, getCostForecast, getPeriodComparison } from './cost-analytics.controller'
import { budgetRouter } from './budget.router'

export const costAnalyticsRouter = Router()

// All routes require authentication
costAnalyticsRouter.use(authenticate)

// View routes require at least COST_ANALYTICS_VIEW permission
costAnalyticsRouter.use(requirePermission(
  PERMISSIONS.COST_ANALYTICS_VIEW,
  PERMISSIONS.COST_ANALYTICS_EDIT,
  PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
))

// Budget routes
costAnalyticsRouter.use('/budgets', budgetRouter)

/**
 * @swagger
 * /cost-analytics/live:
 *   get:
 *     summary: Get live cost analytics (active timers with burn rates)
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live cost data including burn rates and active developers
 */
costAnalyticsRouter.get('/live', getLiveCost)

/**
 * @swagger
 * /cost-analytics/summary:
 *   get:
 *     summary: Get cost summary for date range
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (defaults to 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (defaults to today)
 *     responses:
 *       200:
 *         description: Cost summary including project costs, top performers, and trends
 */
costAnalyticsRouter.get('/summary', getCostSummary)

/**
 * @swagger
 * /cost-analytics/projects:
 *   get:
 *     summary: Get list of all project names
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of project names
 */
costAnalyticsRouter.get('/projects', getProjectList)

/**
 * @swagger
 * /cost-analytics/project/{projectName}:
 *   get:
 *     summary: Get detailed cost data for a specific project
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectName
 *         required: true
 *         schema:
 *           type: string
 *         description: The project name (URL encoded)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (defaults to 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (defaults to today)
 *     responses:
 *       200:
 *         description: Detailed project cost data
 *       404:
 *         description: No data found for this project
 */
costAnalyticsRouter.get('/project/:projectName', getProjectDetail)

/**
 * @swagger
 * /cost-analytics/forecast:
 *   get:
 *     summary: Get cost forecast based on historical trends
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for historical data (defaults to 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for historical data (defaults to today)
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Optional project name to forecast
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *         description: Number of days to forecast (defaults to 30)
 *     responses:
 *       200:
 *         description: Cost forecast data
 */
costAnalyticsRouter.get('/forecast', getCostForecast)

/**
 * @swagger
 * /cost-analytics/compare:
 *   get:
 *     summary: Compare costs between two periods
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currentStart
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of current period
 *       - in: query
 *         name: currentEnd
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of current period
 *       - in: query
 *         name: previousStart
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date of previous period
 *       - in: query
 *         name: previousEnd
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date of previous period
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Optional project name to compare
 *     responses:
 *       200:
 *         description: Period comparison data
 */
costAnalyticsRouter.get('/compare', getPeriodComparison)
