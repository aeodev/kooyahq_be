import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import {
  summarizePage,
  extractActionItems,
  suggestImprovements,
  convertToSOP,
  semanticSearch,
} from './ai.controller'

export const aiRouter = Router()

aiRouter.post('/summarize', authenticate, summarizePage)
aiRouter.post('/extract-actions', authenticate, extractActionItems)
aiRouter.post('/suggest-improvements', authenticate, suggestImprovements)
aiRouter.post('/convert-to-sop', authenticate, convertToSOP)
aiRouter.post('/search', authenticate, semanticSearch)
