import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { uploadCard } from '../../../middleware/upload-card'
import {
  createTicket,
  deleteTicket,
  getTicketsByBoard,
  getTicketById,
  moveTicket,
  updateTicket,
  uploadAttachment,
  deleteAttachment,
  bulkUpdateRanks,
  getTicketDetailsSettings,
  updateTicketDetailsSettings,
  resetTicketDetailsSettings,
} from './ticket.controller'
import { createComment, deleteComment, getCommentsByTicket, updateComment } from '../comments/comment.controller'

export const ticketRouter = Router()

/**
 * @swagger
 * /boards/{boardId}/tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
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
 *               - ticketType
 *             properties:
 *               title:
 *                 type: string
 *               ticketType:
 *                 type: string
 *                 enum: [epic, story, task, bug, subtask]
 *               description:
 *                 type: object
 *               columnId:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [highest, high, medium, low, lowest]
 *               assigneeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ticket created successfully
 */
ticketRouter.post('/boards/:boardId/tickets', authenticate, createTicket)

/**
 * @swagger
 * /boards/{boardId}/tickets:
 *   get:
 *     summary: Get all tickets for a board
 *     tags: [Tickets]
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
 *         description: List of tickets
 */
ticketRouter.get('/boards/:boardId/tickets', authenticate, getTicketsByBoard)

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Tickets]
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
 *         description: Ticket details
 */
ticketRouter.get('/tickets/:id', authenticate, getTicketById)

/**
 * @swagger
 * /tickets/{id}/move:
 *   put:
 *     summary: Move ticket to different column
 *     tags: [Tickets]
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
 *               - boardId
 *             properties:
 *               columnId:
 *                 type: string
 *               boardId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket moved successfully
 */
ticketRouter.put('/tickets/:id/move', authenticate, moveTicket)

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Update ticket
 *     tags: [Tickets]
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
 *               - timestamp
 *               - data
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               data:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: object
 *                   priority:
 *                     type: string
 *                   assigneeId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Ticket updated
 */
ticketRouter.put('/tickets/:id', authenticate, updateTicket)

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete ticket
 *     tags: [Tickets]
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
 *         description: Ticket deleted
 */
ticketRouter.delete('/tickets/:id', authenticate, deleteTicket)


/**
 * @swagger
 * /boards/{boardId}/tickets/bulk-rank:
 *   post:
 *     summary: Bulk update ticket ranks
 *     tags: [Tickets]
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
 *               - rankUpdates
 *             properties:
 *               rankUpdates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - rank
 *                   properties:
 *                     id:
 *                       type: string
 *                     rank:
 *                       type: string
 *     responses:
 *       200:
 *         description: Ranks updated successfully
 */
ticketRouter.post('/boards/:boardId/tickets/bulk-rank', authenticate, bulkUpdateRanks)

/**
 * @swagger
 * /tickets/{ticketId}/attachments:
 *   post:
 *     summary: Upload attachment to ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
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
ticketRouter.post('/tickets/:ticketId/attachments', authenticate, uploadCard.single('image'), uploadAttachment)

/**
 * @swagger
 * /tickets/{ticketId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete ticket attachment
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
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
ticketRouter.delete('/tickets/:ticketId/attachments/:attachmentId', authenticate, deleteAttachment)

/**
 * @swagger
 * /tickets/{ticketId}/comments:
 *   post:
 *     summary: Create comment on ticket
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
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
 *                 type: object
 *     responses:
 *       201:
 *         description: Comment created
 */
ticketRouter.post('/tickets/:ticketId/comments', authenticate, createComment)

/**
 * @swagger
 * /tickets/{ticketId}/comments:
 *   get:
 *     summary: Get all comments for a ticket
 *     tags: [Comments]
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
 *         description: List of comments
 */
ticketRouter.get('/tickets/:ticketId/comments', authenticate, getCommentsByTicket)

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
 *                 type: object
 *     responses:
 *       200:
 *         description: Comment updated
 */
ticketRouter.put('/comments/:id', authenticate, updateComment)

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
ticketRouter.delete('/comments/:id', authenticate, deleteComment)

/**
 * @swagger
 * /ticket-details-settings:
 *   get:
 *     summary: Get ticket details settings for user
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details settings
 */
ticketRouter.get('/ticket-details-settings', authenticate, getTicketDetailsSettings)

/**
 * @swagger
 * /ticket-details-settings:
 *   put:
 *     summary: Update ticket details settings
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boardId:
 *                 type: string
 *               fieldConfigs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fieldName:
 *                       type: string
 *                       enum: [priority, assignee, tags, parent, dueDate, startDate, endDate, branches]
 *                     isVisible:
 *                       type: boolean
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: Settings updated
 */
ticketRouter.put('/ticket-details-settings', authenticate, updateTicketDetailsSettings)

/**
 * @swagger
 * /ticket-details-settings/reset:
 *   post:
 *     summary: Reset ticket details settings to defaults
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Settings reset to defaults
 */
ticketRouter.post('/ticket-details-settings/reset', authenticate, resetTicketDetailsSettings)

