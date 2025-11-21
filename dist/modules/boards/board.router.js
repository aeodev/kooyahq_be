"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const board_controller_1 = require("./board.controller");
exports.boardRouter = (0, express_1.Router)();
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
exports.boardRouter.post('/', authenticate_1.authenticate, board_controller_1.createBoard);
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
exports.boardRouter.get('/', authenticate_1.authenticate, board_controller_1.getBoards);
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
exports.boardRouter.get('/:id', authenticate_1.authenticate, board_controller_1.getBoardById);
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
exports.boardRouter.put('/:id', authenticate_1.authenticate, board_controller_1.updateBoard);
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
exports.boardRouter.delete('/:id', authenticate_1.authenticate, board_controller_1.deleteBoard);
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
exports.boardRouter.post('/:id/sprints', authenticate_1.authenticate, board_controller_1.createSprint);
/**
 * @swagger
 * /boards/{id}/sprints/{sprintId}:
 *   put:
 *     summary: Update a sprint
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 */
exports.boardRouter.put('/:id/sprints/:sprintId', authenticate_1.authenticate, board_controller_1.updateSprint);
/**
 * @swagger
 * /boards/{id}/sprints/{sprintId}:
 *   delete:
 *     summary: Delete a sprint
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 */
exports.boardRouter.delete('/:id/sprints/:sprintId', authenticate_1.authenticate, board_controller_1.deleteSprint);
