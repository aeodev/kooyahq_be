import { Router } from 'express'
import { verifyServerStatusGatewaySecret } from '../gateway-auth.middleware'
import { handleServerStatusGateway } from './server-status.controller'

export const serverStatusGatewayRouter = Router()

/**
 * @swagger
 * /gateways/server-status:
 *   post:
 *     summary: Receive server status updates
 *     tags: [Gateways]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - project
 *               - serverName
 *               - cpu
 *               - memory
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [warning, danger, starting, restarting, shutdown]
 *               project:
 *                 type: string
 *               serverName:
 *                 type: string
 *               container:
 *                 type: string
 *               cpu:
 *                 type: string
 *               memory:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payload accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     received:
 *                       type: boolean
 *                       example: true
 */
serverStatusGatewayRouter.post('/', verifyServerStatusGatewaySecret, handleServerStatusGateway)
