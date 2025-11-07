"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const require_admin_1 = require("../../middleware/require-admin");
const announcement_controller_1 = require("./announcement.controller");
exports.announcementRouter = (0, express_1.Router)();
// Public routes - anyone authenticated can view
exports.announcementRouter.use(authenticate_1.authenticate);
/**
 * @swagger
 * /announcements:
 *   get:
 *     summary: Get all announcements
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: onlyActive
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: List of announcements
 */
exports.announcementRouter.get('/', announcement_controller_1.getAnnouncements);
/**
 * @swagger
 * /announcements/{id}:
 *   get:
 *     summary: Get announcement by ID
 *     tags: [Announcements]
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
 *         description: Announcement details
 */
exports.announcementRouter.get('/:id', announcement_controller_1.getAnnouncement);
// Admin-only routes - creating, updating, deleting
exports.announcementRouter.use(require_admin_1.requireAdmin);
/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Create announcement (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Announcement created
 */
exports.announcementRouter.post('/', announcement_controller_1.createAnnouncement);
/**
 * @swagger
 * /announcements/{id}:
 *   patch:
 *     summary: Update announcement (Admin only)
 *     tags: [Announcements]
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
 *               content:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Announcement updated
 */
exports.announcementRouter.patch('/:id', announcement_controller_1.updateAnnouncement);
/**
 * @swagger
 * /announcements/{id}:
 *   delete:
 *     summary: Delete announcement (Admin only)
 *     tags: [Announcements]
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
 *         description: Announcement deleted
 */
exports.announcementRouter.delete('/:id', announcement_controller_1.deleteAnnouncement);
