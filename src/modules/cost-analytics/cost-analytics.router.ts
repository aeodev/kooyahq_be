import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getLiveCost, getCostSummary, getProjectDetail, getProjectList } from './cost-analytics.controller'

export const costAnalyticsRouter = Router()

// All routes require authentication and SYSTEM_FULL_ACCESS permission
costAnalyticsRouter.use(authenticate)
costAnalyticsRouter.use(requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS))

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
