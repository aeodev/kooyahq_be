import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceById,
  getWorkspaces,
  updateWorkspace,
} from './workspace.controller'

export const workspaceRouter = Router()

/**
 * @swagger
 * /workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
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
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created successfully
 */
workspaceRouter.post(
  '/',
  authenticate,
  createWorkspace
)

/**
 * @swagger
 * /workspaces:
 *   get:
 *     summary: Get all workspaces for current user
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
workspaceRouter.get(
  '/',
  authenticate,
  getWorkspaces
)

/**
 * @swagger
 * /workspaces/{id}:
 *   get:
 *     summary: Get workspace by ID
 *     tags: [Workspaces]
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
 *         description: Workspace details
 */
workspaceRouter.get(
  '/:id',
  authenticate,
  getWorkspaceById
)

/**
 * @swagger
 * /workspaces/{id}:
 *   put:
 *     summary: Update workspace
 *     tags: [Workspaces]
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
 *     responses:
 *       200:
 *         description: Workspace updated
 */
workspaceRouter.put(
  '/:id',
  authenticate,
  updateWorkspace
)

/**
 * @swagger
 * /workspaces/{id}:
 *   delete:
 *     summary: Delete workspace
 *     tags: [Workspaces]
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
 *         description: Workspace deleted
 */
workspaceRouter.delete(
  '/:id',
  authenticate,
  deleteWorkspace
)
