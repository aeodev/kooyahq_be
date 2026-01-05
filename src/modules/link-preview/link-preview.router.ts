import { Router } from 'express'
import { getLinkPreview } from './link-preview.controller'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'

export const linkPreviewRouter = Router()

linkPreviewRouter.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.LINK_PREVIEW_FETCH, PERMISSIONS.SYSTEM_FULL_ACCESS),
  getLinkPreview
)

