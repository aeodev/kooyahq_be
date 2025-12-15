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
projectRouter.get(
  '/',
  requirePermission(
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_MANAGE,
  ),
  getProjects
)

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
projectRouter.get(
  '/:id',
  requirePermission(
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_MANAGE,
  ),
  getProject
)

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
  requirePermission(PERMISSIONS.PROJECTS_MANAGE),
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
projectRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.PROJECTS_MANAGE),
  updateProject
)

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
  requirePermission(PERMISSIONS.PROJECTS_MANAGE),
  deleteProject
)


