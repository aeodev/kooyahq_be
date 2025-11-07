import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { uploadCard } from '../../middleware/upload-card'
import {
  createCard,
  deleteCard,
  getCardsByBoard,
  moveCard,
  updateCard,
  uploadAttachment,
  deleteAttachment,
  serveCardFile,
} from './card.controller'
import { createComment, deleteComment, getCommentsByCard, updateComment } from './comment.controller'

export const cardRouter = Router()

/**
 * @swagger
 * /boards/{boardId}/cards:
 *   post:
 *     summary: Create a new card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - columnId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               columnId:
 *                 type: string
 *               issueType:
 *                 type: string
 *                 enum: [task, bug, story, epic]
 *               priority:
 *                 type: string
 *                 enum: [lowest, low, medium, high, highest]
 *               assigneeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Card created successfully
 */
cardRouter.post('/boards/:boardId/cards', authenticate, createCard)

/**
 * @swagger
 * /boards/{boardId}/cards:
 *   get:
 *     summary: Get all cards for a board
 *     tags: [Cards]
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
 *         description: List of cards
 */
cardRouter.get('/boards/:boardId/cards', authenticate, getCardsByBoard)

/**
 * @swagger
 * /cards/{id}/move:
 *   put:
 *     summary: Move card to different column
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnId
 *             properties:
 *               columnId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card moved successfully
 */
cardRouter.put('/cards/:id/move', authenticate, moveCard)

/**
 * @swagger
 * /cards/{id}:
 *   put:
 *     summary: Update card
 *     tags: [Cards]
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
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card updated
 */
cardRouter.put('/cards/:id', authenticate, updateCard)

/**
 * @swagger
 * /cards/{id}:
 *   delete:
 *     summary: Delete card
 *     tags: [Cards]
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
 *         description: Card deleted
 */
cardRouter.delete('/cards/:id', authenticate, deleteCard)

/**
 * @swagger
 * /cards/files/{filename}:
 *   get:
 *     summary: Serve card attachment file
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File content
 */
cardRouter.get('/cards/files/:filename', serveCardFile)

/**
 * @swagger
 * /cards/{cardId}/attachments:
 *   post:
 *     summary: Upload attachment to card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Attachment uploaded
 */
cardRouter.post('/cards/:cardId/attachments', authenticate, uploadCard.single('image'), uploadAttachment)

/**
 * @swagger
 * /cards/{cardId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete card attachment
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment deleted
 */
cardRouter.delete('/cards/:cardId/attachments/:attachmentId', authenticate, deleteAttachment)

/**
 * @swagger
 * /cards/{cardId}/comments:
 *   post:
 *     summary: Create comment on card
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 */
cardRouter.post('/cards/:cardId/comments', authenticate, createComment)

/**
 * @swagger
 * /cards/{cardId}/comments:
 *   get:
 *     summary: Get all comments for a card
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
cardRouter.get('/cards/:cardId/comments', authenticate, getCommentsByCard)

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update comment
 *     tags: [Comments]
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
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 */
cardRouter.put('/comments/:id', authenticate, updateComment)

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete comment
 *     tags: [Comments]
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
 *         description: Comment deleted
 */
cardRouter.delete('/comments/:id', authenticate, deleteComment)

