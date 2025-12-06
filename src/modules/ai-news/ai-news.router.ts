import { Router } from 'express'
import { getAINews, refreshAINews } from './ai-news.controller'
import { authenticate } from '../../middleware/authenticate'
import { requireAdmin } from '../../middleware/require-admin'

export const aiNewsRouter = Router()

// Public endpoint - no authentication required
aiNewsRouter.get('/', getAINews)

// Admin-only refresh endpoint
aiNewsRouter.post('/refresh', authenticate, requireAdmin, refreshAINews)
