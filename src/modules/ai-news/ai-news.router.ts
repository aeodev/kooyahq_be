import { Router } from 'express'
import { getAINews, refreshAINews } from './ai-news.controller'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'

export const aiNewsRouter = Router()

aiNewsRouter.get('/', authenticate, requirePermission(PERMISSIONS.AI_NEWS_READ, PERMISSIONS.AI_NEWS_FULL_ACCESS), getAINews)
aiNewsRouter.post(
  '/refresh',
  authenticate,
  requirePermission(PERMISSIONS.AI_NEWS_REFRESH, PERMISSIONS.AI_NEWS_FULL_ACCESS),
  refreshAINews
)
