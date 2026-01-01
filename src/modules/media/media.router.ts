import { Router } from 'express'
import { getMediaFile, uploadMedia } from './media.controller'
import { uploadMedia as uploadMediaMiddleware } from '../../middleware/upload-media'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'

export const mediaRouter = Router()

/**
 * @swagger
 * /media/file:
 *   get:
 *     summary: Proxy a stored media file by path
 *     tags: [Media]
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Storage path returned from uploads
 *     responses:
 *       200:
 *         description: Media file stream
 */
mediaRouter.get('/file', getMediaFile)

/**
 * @swagger
 * /media/upload:
 *   post:
 *     summary: Upload media file (image or video) for rich text content
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file
 *     responses:
 *       200:
 *         description: Media uploaded successfully
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
 *                     url:
 *                       type: string
 *                     path:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     mimetype:
 *                       type: string
 *                     size:
 *                       type: number
 */
mediaRouter.post(
  '/upload',
  authenticate,
  requirePermission(PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_FULL_ACCESS),
  uploadMediaMiddleware.single('file'),
  uploadMedia
)
