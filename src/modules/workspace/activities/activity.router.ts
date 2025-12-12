import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import { getTicketActivities, getBoardActivities } from './activity.controller'

export const activityRouter = Router()

/**
 * @swagger
 * /tickets/{ticketId}/activities:
 *   get:
 *     summary: Get activity log for a ticket
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of activities
 */
activityRouter.get(
  '/tickets/:ticketId/activities',
  authenticate,
  requirePermission(PERMISSIONS.TICKET_ACTIVITY_READ, PERMISSIONS.TICKET_FULL_ACCESS),
  getTicketActivities
)

/**
 * @swagger
 * /boards/{boardId}/activities:
 *   get:
 *     summary: Get activity log for a board
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of activities
 */
activityRouter.get(
  '/boards/:boardId/activities',
  authenticate,
  requirePermission(PERMISSIONS.BOARD_ACTIVITY_READ, PERMISSIONS.BOARD_FULL_ACCESS),
  getBoardActivities
)

