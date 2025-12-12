import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from './announcement.controller'

export const announcementRouter = Router()

announcementRouter.use(authenticate)

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Create announcement (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Announcement created
 */
announcementRouter.get('/', requirePermission(PERMISSIONS.ANNOUNCEMENT_READ, PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS), getAnnouncements)
announcementRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.ANNOUNCEMENT_READ, PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
  getAnnouncement
)
announcementRouter.post(
  '/',
  requirePermission(PERMISSIONS.ANNOUNCEMENT_CREATE, PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
  createAnnouncement
)

/**
 * @swagger
 * /announcements/{id}:
 *   patch:
 *     summary: Update announcement (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Announcement updated
 */
announcementRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.ANNOUNCEMENT_UPDATE, PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
  updateAnnouncement
)

/**
 * @swagger
 * /announcements/{id}:
 *   delete:
 *     summary: Delete announcement (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Announcement deleted
 */
announcementRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.ANNOUNCEMENT_DELETE, PERMISSIONS.ANNOUNCEMENT_FULL_ACCESS),
  deleteAnnouncement
)
