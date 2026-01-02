import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  startEgress,
  stopEgress,
  getEgressStatus,
  getActiveEgress,
} from './meet-egress.controller'

const router = Router()

/**
 * @swagger
 * /meet/egress/start/{roomName}:
 *   post:
 *     summary: Start room composite egress recording
 *     tags: [Meet Egress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *         description: The meeting room name/ID
 *     responses:
 *       200:
 *         description: Egress started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     egressId:
 *                       type: string
 *                     status:
 *                       type: string
 *       409:
 *         description: Recording already in progress
 *       500:
 *         description: LiveKit or S3 not configured
 */
router.post(
  '/egress/start/:roomName',
  authenticate,
  requirePermission(PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS),
  startEgress
)

/**
 * @swagger
 * /meet/egress/stop/{egressId}:
 *   post:
 *     summary: Stop egress recording
 *     tags: [Meet Egress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: egressId
 *         required: true
 *         schema:
 *           type: string
 *         description: The egress ID to stop
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomName:
 *                 type: string
 *                 description: Optional room name for cleanup
 *     responses:
 *       200:
 *         description: Egress stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     egressId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     recordingUrl:
 *                       type: string
 *                     duration:
 *                       type: number
 */
router.post(
  '/egress/stop/:egressId',
  authenticate,
  requirePermission(PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS),
  stopEgress
)

/**
 * @swagger
 * /meet/egress/status/{egressId}:
 *   get:
 *     summary: Get egress status
 *     tags: [Meet Egress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: egressId
 *         required: true
 *         schema:
 *           type: string
 *         description: The egress ID to check
 *     responses:
 *       200:
 *         description: Egress status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     egressId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     recordingUrl:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     error:
 *                       type: string
 *       404:
 *         description: Egress not found
 */
router.get(
  '/egress/status/:egressId',
  authenticate,
  requirePermission(PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS),
  getEgressStatus
)

/**
 * @swagger
 * /meet/egress/active/{roomName}:
 *   get:
 *     summary: Get active egress for a room
 *     tags: [Meet Egress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomName
 *         required: true
 *         schema:
 *           type: string
 *         description: The meeting room name/ID
 *     responses:
 *       200:
 *         description: Active egress info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isRecording:
 *                       type: boolean
 *                     egressId:
 *                       type: string
 *                     status:
 *                       type: string
 */
router.get(
  '/egress/active/:roomName',
  authenticate,
  requirePermission(PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS),
  getActiveEgress
)

export default router

