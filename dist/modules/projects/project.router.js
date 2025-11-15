"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const require_admin_1 = require("../../middleware/require-admin");
const project_controller_1 = require("./project.controller");
exports.projectRouter = (0, express_1.Router)();
// All authenticated users can view projects
exports.projectRouter.use(authenticate_1.authenticate);
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
exports.projectRouter.get('/', project_controller_1.getProjects);
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
exports.projectRouter.get('/:id', project_controller_1.getProject);
// Admin-only routes - creating, updating, deleting
exports.projectRouter.use(require_admin_1.requireAdmin);
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
exports.projectRouter.post('/', project_controller_1.createProject);
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
exports.projectRouter.put('/:id', project_controller_1.updateProject);
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
exports.projectRouter.delete('/:id', project_controller_1.deleteProject);
