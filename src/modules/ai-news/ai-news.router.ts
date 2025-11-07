import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { getAINews } from './ai-news.controller'

export const aiNewsRouter = Router()

aiNewsRouter.use(authenticate)
aiNewsRouter.get('/', getAINews)

