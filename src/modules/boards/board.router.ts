import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
    createBoard,
    deleteBoard,
    getBoardById,
    getBoards,
    updateBoard,
    createSprint,
    updateSprint,
    deleteSprint,
} from './board.controller'

export const boardRouter = Router()

/**
 * @swagger
 * /boards:
 *   post:
 *     summary: Create a new board
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       201:
 *         description: Board created successfully
 */
boardRouter.post('/', authenticate, createBoard)

/**
 * @swagger
 * /boards:
 *   get:
 *     summary: Get all boards for current user
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of boards
 */
boardRouter.get('/', authenticate, getBoards)

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
boardRouter.get('/:id', authenticate, getBoardById)

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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               columns:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Board updated
 */
boardRouter.put('/:id', authenticate, updateBoard)

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
boardRouter.delete('/:id', authenticate, deleteBoard)

// Sprint Routes

/**
 * @swagger
 * /boards/{id}/sprints:
 *   post:
 *     summary: Add a sprint to a board
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 */
boardRouter.post('/:id/sprints', authenticate, createSprint)

/**
 * @swagger
 * /boards/{id}/sprints/{sprintId}:
 *   put:
 *     summary: Update a sprint
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 */
boardRouter.put('/:id/sprints/:sprintId', authenticate, updateSprint)

/**
 * @swagger
 * /boards/{id}/sprints/{sprintId}:
 *   delete:
 *     summary: Delete a sprint
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 */
boardRouter.delete('/:id/sprints/:sprintId', authenticate, deleteSprint)

