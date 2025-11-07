import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import {
  getAllTodayEntries,
  getMyEntries,
  getActiveTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  endDay,
  logManualEntry,
  updateEntry,
  deleteEntry,
  getAnalytics,
  getMyEntriesByDateRange,
} from './time-entry.controller'

export const timeEntryRouter = Router()

timeEntryRouter.use(authenticate)

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
timeEntryRouter.get('/', getAllTodayEntries)

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
timeEntryRouter.get('/me', getMyEntries)

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
timeEntryRouter.get('/me/range', getMyEntriesByDateRange)

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
timeEntryRouter.get('/analytics', getAnalytics)

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
timeEntryRouter.get('/timer/active', getActiveTimer)

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
 *               status:
 *                 type: string
 *                 enum: [Billable, Internal]
 *     responses:
 *       200:
 *         description: Timer started
 */
timeEntryRouter.post('/timer/start', startTimer)

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
timeEntryRouter.post('/timer/pause', pauseTimer)

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
timeEntryRouter.post('/timer/resume', resumeTimer)

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
timeEntryRouter.post('/timer/stop', stopTimer)

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
timeEntryRouter.post('/timer/end-day', endDay)

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
 *               status:
 *                 type: string
 *                 enum: [Billable, Internal]
 *     responses:
 *       201:
 *         description: Time entry logged
 */
timeEntryRouter.post('/manual', logManualEntry)

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
timeEntryRouter.put('/:id', updateEntry)

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
timeEntryRouter.delete('/:id', deleteEntry)

