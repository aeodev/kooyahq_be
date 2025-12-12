import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from './project.controller'

export const projectRouter = Router()

projectRouter.use(authenticate)

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 */
projectRouter.get('/', requirePermission(PERMISSIONS.PROJECT_READ, PERMISSIONS.PROJECT_FULL_ACCESS), getProjects)

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
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
 *         description: Project details
 */
projectRouter.get('/:id', requirePermission(PERMISSIONS.PROJECT_READ, PERMISSIONS.PROJECT_FULL_ACCESS), getProject)

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create project (Admin only)
 *     tags: [Projects]
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
 *     responses:
 *       201:
 *         description: Project created
 */
projectRouter.post(
  '/',
  requirePermission(PERMISSIONS.PROJECT_CREATE, PERMISSIONS.PROJECT_FULL_ACCESS),
  createProject
)

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update project (Admin only)
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Project updated
 */
projectRouter.put('/:id', requirePermission(PERMISSIONS.PROJECT_UPDATE, PERMISSIONS.PROJECT_FULL_ACCESS), updateProject)

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete project (Admin only)
 *     tags: [Projects]
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
 *         description: Project deleted
 */
projectRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_DELETE, PERMISSIONS.PROJECT_FULL_ACCESS),
  deleteProject
)




