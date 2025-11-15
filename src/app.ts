import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env'
import { errorHandler } from './middleware/error-handler'
import { authRouter } from './modules/auth/auth.router'
import { boardRouter } from './modules/boards/board.router'
import { cardRouter } from './modules/cards/card.router'
import { userRouter } from './modules/users/user.router'
import { timeEntryRouter } from './modules/time-tracker/time-entry.router'
import { galleryRouter } from './modules/gallery/gallery.router'
import { aiNewsRouter } from './modules/ai-news/ai-news.router'
import { postRouter } from './modules/posts/post.router'
import { notificationRouter } from './modules/notifications/notification.router'
import { gameRouter } from './modules/games/game.router'
import { announcementRouter } from './modules/announcements/announcement.router'
import { projectRouter } from './modules/projects/project.router'
import { healthRouter } from './routes/health'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger'
import { presenceRouter } from './modules/presence/presence.router'

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
  app.use(express.json())

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KooyaHQ API Documentation',
  }))

  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/health', healthRouter)
  app.use('/api/time-entries', timeEntryRouter)
  app.use('/api/gallery', galleryRouter)
  app.use('/api/ai-news', aiNewsRouter)
  app.use('/api/posts', postRouter)
  app.use('/api/notifications', notificationRouter)
  app.use('/api/presence', presenceRouter)
  app.use('/api/games', gameRouter)
  app.use('/api/announcements', announcementRouter)
  app.use('/api/projects', projectRouter)
  // CRITICAL: Register board router BEFORE card router
  // This ensures /api/boards routes match before the more general /api routes
  app.use('/api/boards', boardRouter)
  // Card router routes (/api/boards/:boardId/cards and /api/cards/:id) come after
  app.use('/api', cardRouter)

  app.use((_req, res) => {
    res.status(404).json({ status: 'error', message: 'Route not found' })
  })

  app.use(errorHandler)

  return app
}
