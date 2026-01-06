import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { errorHandler } from './middleware/error-handler'
import { authRouter } from './modules/auth/auth.router'
import { workspaceRouter } from './modules/workspace/workspace/workspace.router'
import { boardRouter } from './modules/workspace/boards/board.router'
import { ticketRouter } from './modules/workspace/tickets/ticket.router'
import { activityRouter } from './modules/workspace/activities/activity.router'
import { userRouter } from './modules/users/user.router'
import { timeEntryRouter } from './modules/time-tracker/time-entry.router'
import { galleryRouter } from './modules/gallery/gallery.router'
import { aiNewsRouter } from './modules/ai-news/ai-news.router'
import { postRouter } from './modules/posts/post.router'
import { notificationRouter } from './modules/notifications/notification.router'
import { gameRouter } from './modules/games/game.router'
import { announcementRouter } from './modules/announcements/announcement.router'
import { projectRouter } from './modules/projects/project.router'
import { userManagementRouter } from './modules/user-management/user-management.router'
import { githubGatewayRouter } from './modules/gateways/github/github.router'
import { serverManagementRouter } from './modules/server-managmenet/server-management/server-management.router'
import { healthRouter } from './routes/health'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger'
import { presenceRouter } from './modules/presence/presence.router'
import { meetRouter } from './modules/meet/meet.router'
import { mediaRouter } from './modules/media/media.router'
import { linkPreviewRouter } from './modules/link-preview/link-preview.router'
import { cesiumRouter } from './modules/cesium/cesium.router'
import { settingsRouter } from './modules/settings/settings.router'

export function createApp() {
  const app = express()

  app.set('trust proxy', env.nodeEnv === 'production')

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true)
        
        // Check if origin is in allowed list
        if (env.clientUrls.includes(origin)) {
          return callback(null, true)
        }
        
        // In development, allow localhost with any port
        if (env.nodeEnv === 'development' && origin.startsWith('http://localhost:')) {
          return callback(null, true)
        }
        
        callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  app.use(cookieParser())
  app.use(express.json())

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KooyaHQ API Documentation',
  }))

  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/health', healthRouter)
  app.use('/api/health', healthRouter)
  app.use('/api/time-entries', timeEntryRouter)
  app.use('/api/gallery', galleryRouter)
  app.use('/api/ai-news', aiNewsRouter)
  app.use('/api/link-preview', linkPreviewRouter)
  app.use('/api/posts', postRouter)
  app.use('/api/notifications', notificationRouter)
  app.use('/api/presence', presenceRouter)
  app.use('/api/meet', meetRouter)
  app.use('/api/games', gameRouter)
  app.use('/api/announcements', announcementRouter)
  app.use('/api/projects', projectRouter)
  app.use('/api/media', mediaRouter)
  app.use('/api/cesium', cesiumRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/gateways/github', githubGatewayRouter)
  app.use('/api/server-management', serverManagementRouter)
  // Workspace module routes
  app.use('/api/workspaces', workspaceRouter)
  app.use('/api/user-management', userManagementRouter)
  // Board routes must come before ticket routes to ensure correct matching
  app.use('/api', boardRouter)
  // Ticket router routes (/api/boards/:boardId/tickets and /api/tickets/:id) come after
  app.use('/api', ticketRouter)
  // Activity router (read-only GET endpoints)
  app.use('/api', activityRouter)

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
      timestamp: new Date().toISOString(),
    })
  })

  app.use(errorHandler)

  return app
}
