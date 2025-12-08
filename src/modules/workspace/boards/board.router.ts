import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import {
  createBoard,
  deleteBoard,
  getBoardById,
  getBoardByKey,
  getBoards,
  updateBoard,
  toggleFavoriteBoard,
} from './board.controller'

export const boardRouter = Router()

/**
 * @swagger
 * /workspaces/{workspaceId}/boards:
 *   post:
 *     summary: Create a new board
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
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
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [kanban, sprint]
 *               description:
 *                 type: string
 *               prefix:
 *                 type: string
 *               emoji:
 *                 type: string
 *     responses:
 *       201:
 *         description: Board created successfully
 */
boardRouter.post('/workspaces/:workspaceId/boards', authenticate, createBoard)

/**
 * @swagger
 * /workspaces/{workspaceId}/boards:
 *   get:
 *     summary: Get all boards for a workspace
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [kanban, sprint]
 *     responses:
 *       200:
 *         description: List of boards
 */
boardRouter.get('/workspaces/:workspaceId/boards', authenticate, getBoards)

/**
 * @swagger
 * /boards/{id}:
 *   get:
 *     summary: Get board by ID
 *     tags: [Boards]
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
 *         description: Board details
 *       404:
 *         description: Board not found
 */
boardRouter.get('/boards/:id', authenticate, getBoardById)

/**
 * @swagger
 * /boards/key/{key}:
 *   get:
 *     summary: Get board by prefix/key
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Board details
 *       404:
 *         description: Board not found
 */
boardRouter.get('/boards/key/:key', authenticate, getBoardByKey)

/**
 * @swagger
 * /boards/{id}:
 *   put:
 *     summary: Update board
 *     tags: [Boards]
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
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   prefix:
 *                     type: string
 *                   emoji:
 *                     type: string
 *                   settings:
 *                     type: object
 *                   columns:
 *                     type: array
 *                   members:
 *                     type: array
 *     responses:
 *       200:
 *         description: Board updated
 */
boardRouter.put('/boards/:id', authenticate, updateBoard)

/**
 * @swagger
 * /boards/{id}:
 *   delete:
 *     summary: Delete board
 *     tags: [Boards]
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
 *         description: Board deleted
 */
boardRouter.delete('/boards/:id', authenticate, deleteBoard)

/**
 * @swagger
 * /boards/{boardId}/favorite:
 *   post:
 *     summary: Toggle favorite status for a board
 *     tags: [Boards]
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
 *         description: Favorite status toggled
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
 *                     isFavorite:
 *                       type: boolean
 */
boardRouter.post('/boards/:boardId/favorite', authenticate, toggleFavoriteBoard)
