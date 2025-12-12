import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import {
  getAllTodayEntries,
  getMyEntries,
  getActiveTimer,
  startTimer,
  addTask,
  pauseTimer,
  resumeTimer,
  stopTimer,
  endDay,
  logManualEntry,
  updateEntry,
  deleteEntry,
  getAnalytics,
  getMyEntriesByDateRange,
  getDayEndedStatus,
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
timeEntryRouter.get(
  '/',
  requirePermission(PERMISSIONS.TIME_ENTRY_READ, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  getAllTodayEntries
)

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
timeEntryRouter.get(
  '/me',
  requirePermission(PERMISSIONS.TIME_ENTRY_READ, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  getMyEntries
)

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
timeEntryRouter.get(
  '/me/range',
  requirePermission(PERMISSIONS.TIME_ENTRY_READ, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  getMyEntriesByDateRange
)

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
timeEntryRouter.get(
  '/analytics',
  requirePermission(PERMISSIONS.TIME_ENTRY_ANALYTICS, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  getAnalytics
)

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
timeEntryRouter.get(
  '/timer/active',
  requirePermission(PERMISSIONS.TIME_ENTRY_READ, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  getActiveTimer
)

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
timeEntryRouter.get(
  '/timer/day-ended-status',
  requirePermission(PERMISSIONS.TIME_ENTRY_READ, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  getDayEndedStatus
)

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
timeEntryRouter.post(
  '/timer/start',
  requirePermission(PERMISSIONS.TIME_ENTRY_CREATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  startTimer
)

/**
 * @swagger
 * /time-entries/timer/add-task:
 *   post:
 *     summary: Add task to active timer
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
 *             properties:
 *               task:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task added to active timer
 */
timeEntryRouter.post(
  '/timer/add-task',
  requirePermission(PERMISSIONS.TIME_ENTRY_UPDATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  addTask
)

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
timeEntryRouter.post(
  '/timer/pause',
  requirePermission(PERMISSIONS.TIME_ENTRY_UPDATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  pauseTimer
)

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
timeEntryRouter.post(
  '/timer/resume',
  requirePermission(PERMISSIONS.TIME_ENTRY_UPDATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  resumeTimer
)

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
timeEntryRouter.post(
  '/timer/stop',
  requirePermission(PERMISSIONS.TIME_ENTRY_UPDATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  stopTimer
)

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
timeEntryRouter.post(
  '/timer/end-day',
  requirePermission(PERMISSIONS.TIME_ENTRY_UPDATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  endDay
)

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
timeEntryRouter.post(
  '/manual',
  requirePermission(PERMISSIONS.TIME_ENTRY_CREATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  logManualEntry
)

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
timeEntryRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.TIME_ENTRY_UPDATE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  updateEntry
)

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
timeEntryRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.TIME_ENTRY_DELETE, PERMISSIONS.TIME_ENTRY_FULL_ACCESS),
  deleteEntry
)
