import { Router } from 'express'
import { getLinkPreview } from './link-preview.controller'

export const linkPreviewRouter = Router()

linkPreviewRouter.get('/', getLinkPreview)
