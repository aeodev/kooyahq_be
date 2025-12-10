import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import {
  createTicket,
  deleteTicket,
  getTicketsByBoard,
  getTicketById,
  updateTicket,
  bulkUpdateRanks,
  addRelatedTicket,
  removeRelatedTicket,
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
 * /tickets/{id}:
 *   put:
 *     summary: Update ticket (unified endpoint for all ticket changes)
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
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Optional timestamp for race condition handling
 *               data:
 *                 type: object
 *                 description: Only include fields that are being changed
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: object
 *                   columnId:
 *                     type: string
 *                     description: Moving ticket to different column
 *                   rank:
 *                     type: string
 *                   priority:
 *                     type: string
 *                   assigneeId:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   points:
 *                     type: number
 *                   acceptanceCriteria:
 *                     type: array
 *                   documents:
 *                     type: array
 *                   attachments:
 *                     type: array
 *                     description: Full attachments array (include all existing + new, exclude removed)
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                   github:
 *                     type: object
 *                   parentTicketId:
 *                     type: string
 *                   rootEpicId:
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
 * /tickets/{id}/related-tickets:
 *   post:
 *     summary: Add a related ticket
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
 *               - relatedTicketId
 *             properties:
 *               relatedTicketId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Related ticket added
 */
ticketRouter.post('/tickets/:id/related-tickets', authenticate, addRelatedTicket)

/**
 * @swagger
 * /tickets/{id}/related-tickets/{relatedTicketId}:
 *   delete:
 *     summary: Remove a related ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: relatedTicketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Related ticket removed
 */
ticketRouter.delete('/tickets/:id/related-tickets/:relatedTicketId', authenticate, removeRelatedTicket)


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


