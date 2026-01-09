import { Router } from 'express'
import { verifyServerStatusGatewaySecret } from '../gateway-auth.middleware'
import { handleServerStatusGateway } from './server-status.controller'

export const serverStatusGatewayRouter = Router()

/**
 * @swagger
 * /gateways/server-status:
 *   post:
 *     summary: Receive server status updates from system-status
 *     description: |
 *       Accepts status updates from the system-status monitoring script.
 *       Includes detailed metrics, alerts, and container health information.
 *     tags: [Gateways]
 *     parameters:
 *       - in: header
 *         name: X-Status-Event
 *         schema:
 *           type: string
 *           enum: [status, lifecycle]
 *         description: Event type
 *       - in: header
 *         name: X-Status-Level
 *         schema:
 *           type: string
 *           enum: [healthy, info, warning, danger, critical, starting, shutdown, restarting]
 *         description: Overall status level
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *               - project
 *               - server
 *               - status
 *             properties:
 *               version:
 *                 type: string
 *                 example: "1.0.0"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               event_type:
 *                 type: string
 *                 enum: [status, lifecycle]
 *               project:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [healthy, info, warning, danger, critical, starting, shutdown, restarting]
 *               server:
 *                 type: object
 *                 required:
 *                   - name
 *                 properties:
 *                   name:
 *                     type: string
 *                   hostname:
 *                     type: string
 *                   status:
 *                     type: string
 *                   uptime_seconds:
 *                     type: number
 *                   process_count:
 *                     type: number
 *               metrics:
 *                 type: object
 *                 properties:
 *                   cpu:
 *                     type: object
 *                     properties:
 *                       current_percent:
 *                         type: number
 *                       average_15m_percent:
 *                         type: number
 *                       is_ready:
 *                         type: boolean
 *                   memory:
 *                     type: object
 *                     properties:
 *                       current_percent:
 *                         type: number
 *                       average_15m_percent:
 *                         type: number
 *                       used_bytes:
 *                         type: number
 *                       total_bytes:
 *                         type: number
 *                       is_ready:
 *                         type: boolean
 *               alert_summary:
 *                 type: object
 *                 properties:
 *                   total:
 *                     type: number
 *                   by_risk:
 *                     type: object
 *                     properties:
 *                       critical:
 *                         type: number
 *                       danger:
 *                         type: number
 *                       warning:
 *                         type: number
 *                       info:
 *                         type: number
 *                   has_critical:
 *                     type: boolean
 *                   has_danger:
 *                     type: boolean
 *                   has_warning:
 *                     type: boolean
 *               instance_alerts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     risk:
 *                       type: string
 *                       enum: [info, warning, danger, critical]
 *                     category:
 *                       type: string
 *                     type:
 *                       type: string
 *                     title:
 *                       type: string
 *                     message:
 *                       type: string
 *               containers:
 *                 type: object
 *                 properties:
 *                   total:
 *                     type: number
 *                   running:
 *                     type: number
 *                   stopped:
 *                     type: number
 *                   restarting:
 *                     type: number
 *                   alerts:
 *                     type: array
 *                     items:
 *                       type: object
 *               health_changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     scope:
 *                       type: string
 *                       enum: [instance, container]
 *                     name:
 *                       type: string
 *                     change_type:
 *                       type: string
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                     risk:
 *                       type: string
 *                     message:
 *                       type: string
 *               lifecycle:
 *                 type: object
 *                 properties:
 *                   event:
 *                     type: string
 *                     enum: [starting, shutdown, restarting]
 *                   reason:
 *                     type: string
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
 *                     event_type:
 *                       type: string
 *                     status:
 *                       type: string
 *                     alerts_total:
 *                       type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid payload format
 */
serverStatusGatewayRouter.post('/', verifyServerStatusGatewaySecret, handleServerStatusGateway)
