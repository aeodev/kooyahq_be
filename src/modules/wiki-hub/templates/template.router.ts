import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createPageFromTemplate,
} from './template.controller'

export const templateRouter = Router()

templateRouter.get('/', authenticate, getTemplates)
templateRouter.post('/', authenticate, createTemplate)
templateRouter.get('/:id', authenticate, getTemplate)
templateRouter.put('/:id', authenticate, updateTemplate)
templateRouter.delete('/:id', authenticate, deleteTemplate)
templateRouter.post('/:id/pages', authenticate, createPageFromTemplate)
