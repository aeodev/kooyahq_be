import { Router } from 'express'
import { generateToken } from './meet.controller'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import recordingRouter from './meet-recording.router'

export const meetRouter = Router()

/**
 * @swagger
 * /meet/token:
 *   post:
 *     summary: Generate LiveKit access token for meeting room
 *     tags: [Meet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomName
 *             properties:
 *               roomName:
 *                 type: string
 *                 description: Meeting room name/ID
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: LiveKit access token
 *                     url:
 *                       type: string
 *                       description: LiveKit WebSocket URL
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: LiveKit server not configured
 */
meetRouter.post(
  '/token',
  authenticate,
  requirePermission(PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS),
  generateToken
)

// Recording routes
meetRouter.use('/', recordingRouter)


