import { Router } from 'express'
import { currentUser, loginWithGoogle, logout, refreshSession } from './auth.controller'
import { authenticate } from '../../middleware/authenticate'

export const authRouter = Router()

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login with Google ID token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google ID token
 *     responses:
 *       200:
 *         description: Login successful
 */
authRouter.post('/google', loginWithGoogle)

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Access token refreshed
 */
authRouter.post('/refresh', refreshSession)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and revoke refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
authRouter.post('/logout', logout)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
authRouter.get('/me', authenticate, currentUser)
