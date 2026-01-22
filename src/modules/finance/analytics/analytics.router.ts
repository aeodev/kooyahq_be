/**
 * Analytics Router
 * 
 * SECURITY:
 * - Default routes return SAFE (sanitized) data without monthlySalary/hourlyRate
 * - Privileged routes (/live/privileged, /summary/privileged, etc.) require USERS_MANAGE
 */

import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  getLiveCost,
  getCostSummary,
  getProjectDetail,
  getProjectList,
  getCostForecast,
  getPeriodComparison,
  getLiveCostPrivileged,
  getCostSummaryPrivileged,
  getProjectDetailPrivileged,
} from './analytics.controller'

export const analyticsRouter = Router()

// All routes require authentication
analyticsRouter.use(authenticate)

// Base permission check - need FINANCE_VIEW (or equivalent)
analyticsRouter.use(requirePermission(
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_EDIT,
  PERMISSIONS.FINANCE_FULL_ACCESS,
  // Legacy permissions for backward compatibility
  PERMISSIONS.COST_ANALYTICS_VIEW,
  PERMISSIONS.COST_ANALYTICS_EDIT,
  PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
))

// ============================================================================
// SAFE (DEFAULT) ROUTES - No salary/rate exposure
// ============================================================================

/**
 * @swagger
 * /finance/analytics/live:
 *   get:
 *     summary: Get live cost analytics (SAFE - no salary/rate data)
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live cost data (sanitized)
 */
analyticsRouter.get('/live', getLiveCost)

/**
 * @swagger
 * /finance/analytics/summary:
 *   get:
 *     summary: Get cost summary (SAFE - no salary/rate data)
 *     tags: [Finance Analytics]
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
 *         description: Cost summary (sanitized)
 */
analyticsRouter.get('/summary', getCostSummary)

/**
 * @swagger
 * /finance/analytics/projects:
 *   get:
 *     summary: Get list of all project names
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of project names
 */
analyticsRouter.get('/projects', getProjectList)

/**
 * @swagger
 * /finance/analytics/forecast:
 *   get:
 *     summary: Get cost forecast based on historical trends
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cost forecast data
 */
analyticsRouter.get('/forecast', getCostForecast)

/**
 * @swagger
 * /finance/analytics/compare:
 *   get:
 *     summary: Compare costs between two periods
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Period comparison data
 */
analyticsRouter.get('/compare', getPeriodComparison)

/**
 * @swagger
 * /finance/analytics/project/{projectName}:
 *   get:
 *     summary: Get detailed cost data for a specific project (SAFE - no salary/rate data)
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectName
 *         required: true
 *         schema:
 *           type: string
 *         description: The project name (URL encoded)
 *     responses:
 *       200:
 *         description: Project cost data (sanitized)
 *       404:
 *         description: No data found for this project
 */
analyticsRouter.get('/project/:projectName', getProjectDetail)

// ============================================================================
// PRIVILEGED ROUTES - Require USERS_MANAGE permission
// Include salary/rate data
// ============================================================================

/**
 * @swagger
 * /finance/analytics/live/privileged:
 *   get:
 *     summary: Get live cost analytics with salary/rate data (PRIVILEGED)
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       **PRIVILEGED ENDPOINT** - Requires USERS_MANAGE permission.
 *       Returns full developer data including monthlySalary and hourlyRate.
 *     responses:
 *       200:
 *         description: Live cost data with salary/rate information
 *       403:
 *         description: Forbidden - requires USERS_MANAGE permission
 */
analyticsRouter.get(
  '/live/privileged',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  getLiveCostPrivileged
)

/**
 * @swagger
 * /finance/analytics/summary/privileged:
 *   get:
 *     summary: Get cost summary with salary/rate data (PRIVILEGED)
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       **PRIVILEGED ENDPOINT** - Requires USERS_MANAGE permission.
 *       Returns full developer data including hourlyRate.
 *     responses:
 *       200:
 *         description: Cost summary with salary/rate information
 *       403:
 *         description: Forbidden - requires USERS_MANAGE permission
 */
analyticsRouter.get(
  '/summary/privileged',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  getCostSummaryPrivileged
)

/**
 * @swagger
 * /finance/analytics/project/{projectName}/privileged:
 *   get:
 *     summary: Get project detail with salary/rate data (PRIVILEGED)
 *     tags: [Finance Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       **PRIVILEGED ENDPOINT** - Requires USERS_MANAGE permission.
 *       Returns full developer data including hourlyRate.
 *     parameters:
 *       - in: path
 *         name: projectName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project cost data with salary/rate information
 *       403:
 *         description: Forbidden - requires USERS_MANAGE permission
 *       404:
 *         description: No data found for this project
 */
analyticsRouter.get(
  '/project/:projectName/privileged',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  getProjectDetailPrivileged
)
