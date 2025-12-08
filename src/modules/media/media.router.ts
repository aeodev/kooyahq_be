import { Router } from 'express'
import { uploadMedia } from './media.controller'
import { uploadMedia as uploadMediaMiddleware } from '../../middleware/upload-media'
import { authenticate } from '../../middleware/authenticate'

export const mediaRouter = Router()

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
 *                     publicId:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     mimetype:
 *                       type: string
 *                     size:
 *                       type: number
 */
mediaRouter.post('/upload', authenticate, uploadMediaMiddleware.single('file'), uploadMedia)

