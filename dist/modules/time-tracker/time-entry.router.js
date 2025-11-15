"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeEntryRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const time_entry_controller_1 = require("./time-entry.controller");
exports.timeEntryRouter = (0, express_1.Router)();
exports.timeEntryRouter.use(authenticate_1.authenticate);
/**
 * @swagger
 * /time-entries:
 *   get:
 *     summary: Get all today's time entries
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of today's time entries
 */
exports.timeEntryRouter.get('/', time_entry_controller_1.getAllTodayEntries);
/**
 * @swagger
 * /time-entries/me:
 *   get:
 *     summary: Get current user's time entries
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's time entries
 */
exports.timeEntryRouter.get('/me', time_entry_controller_1.getMyEntries);
/**
 * @swagger
 * /time-entries/me/range:
 *   get:
 *     summary: Get user's time entries by date range
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Time entries in range
 */
exports.timeEntryRouter.get('/me/range', time_entry_controller_1.getMyEntriesByDateRange);
/**
 * @swagger
 * /time-entries/analytics:
 *   get:
 *     summary: Get time tracking analytics
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics data
 */
exports.timeEntryRouter.get('/analytics', time_entry_controller_1.getAnalytics);
/**
 * @swagger
 * /time-entries/timer/active:
 *   get:
 *     summary: Get active timer
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active timer data
 */
exports.timeEntryRouter.get('/timer/active', time_entry_controller_1.getActiveTimer);
/**
 * @swagger
 * /time-entries/timer/day-ended-status:
 *   get:
 *     summary: Check if user ended day today
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Day ended status
 */
exports.timeEntryRouter.get('/timer/day-ended-status', time_entry_controller_1.getDayEndedStatus);
/**
 * @swagger
 * /time-entries/timer/start:
 *   post:
 *     summary: Start timer
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task
 *               - projects
 *             properties:
 *               task:
 *                 type: string
 *               projects:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Timer started
 */
exports.timeEntryRouter.post('/timer/start', time_entry_controller_1.startTimer);
/**
 * @swagger
 * /time-entries/timer/pause:
 *   post:
 *     summary: Pause active timer
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timer paused
 */
exports.timeEntryRouter.post('/timer/pause', time_entry_controller_1.pauseTimer);
/**
 * @swagger
 * /time-entries/timer/resume:
 *   post:
 *     summary: Resume paused timer
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timer resumed
 */
exports.timeEntryRouter.post('/timer/resume', time_entry_controller_1.resumeTimer);
/**
 * @swagger
 * /time-entries/timer/stop:
 *   post:
 *     summary: Stop active timer
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timer stopped
 */
exports.timeEntryRouter.post('/timer/stop', time_entry_controller_1.stopTimer);
/**
 * @swagger
 * /time-entries/timer/end-day:
 *   post:
 *     summary: End day (stop all active timers)
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Day ended
 */
exports.timeEntryRouter.post('/timer/end-day', time_entry_controller_1.endDay);
/**
 * @swagger
 * /time-entries/manual:
 *   post:
 *     summary: Log manual time entry
 *     tags: [Time Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task
 *               - projects
 *               - duration
 *             properties:
 *               task:
 *                 type: string
 *               projects:
 *                 type: array
 *                 items:
 *                   type: string
 *               duration:
 *                 type: number
 *                 description: Duration in minutes
 *     responses:
 *       201:
 *         description: Time entry logged
 */
exports.timeEntryRouter.post('/manual', time_entry_controller_1.logManualEntry);
/**
 * @swagger
 * /time-entries/{id}:
 *   put:
 *     summary: Update time entry
 *     tags: [Time Entries]
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
 *         description: Time entry updated
 */
exports.timeEntryRouter.put('/:id', time_entry_controller_1.updateEntry);
/**
 * @swagger
 * /time-entries/{id}:
 *   delete:
 *     summary: Delete time entry
 *     tags: [Time Entries]
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
 *         description: Time entry deleted
 */
exports.timeEntryRouter.delete('/:id', time_entry_controller_1.deleteEntry);
