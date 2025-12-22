import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { createRateLimiter } from '../../../middleware/rate-limit'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  createServerManagementAction,
  createServerManagementProject,
  createServerManagementServer,
  deleteServerManagementAction,
  deleteServerManagementProject,
  deleteServerManagementServer,
  getServerManagementProject,
  getServerManagementProjects,
  getServerManagementStatus,
  runServerManagementAction,
  updateServerManagementAction,
  updateServerManagementProject,
  updateServerManagementServer,
} from './server-management.controller'

export const serverManagementRouter = Router()

serverManagementRouter.use(authenticate)
const serverManagementLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  keyPrefix: 'server-management',
})
const serverManagementActionLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyPrefix: 'server-management-action',
})

serverManagementRouter.use(serverManagementLimiter)

const viewPermissions = [
  PERMISSIONS.SERVER_MANAGEMENT_VIEW,
  PERMISSIONS.SERVER_MANAGEMENT_USE,
  PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
  PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
]

const usePermissions = [
  PERMISSIONS.SERVER_MANAGEMENT_USE,
  PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
  PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
]

serverManagementRouter.get('/projects', requirePermission(...viewPermissions), getServerManagementProjects)
serverManagementRouter.post('/projects', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), createServerManagementProject)
serverManagementRouter.get('/projects/:projectId', requirePermission(...viewPermissions), getServerManagementProject)
serverManagementRouter.patch('/projects/:projectId', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), updateServerManagementProject)
serverManagementRouter.delete('/projects/:projectId', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), deleteServerManagementProject)

serverManagementRouter.post('/projects/:projectId/servers', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), createServerManagementServer)
serverManagementRouter.patch('/projects/:projectId/servers/:serverId', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), updateServerManagementServer)
serverManagementRouter.delete('/projects/:projectId/servers/:serverId', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), deleteServerManagementServer)

serverManagementRouter.post('/projects/:projectId/servers/:serverId/actions', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), createServerManagementAction)
serverManagementRouter.patch('/projects/:projectId/servers/:serverId/actions/:actionId', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), updateServerManagementAction)
serverManagementRouter.delete('/projects/:projectId/servers/:serverId/actions/:actionId', requirePermission(PERMISSIONS.SERVER_MANAGEMENT_MANAGE), deleteServerManagementAction)

serverManagementRouter.post(
  '/servers/:serverId/actions/:actionId/run',
  serverManagementActionLimiter,
  requirePermission(...usePermissions),
  runServerManagementAction
)
serverManagementRouter.post(
  '/servers/:serverId/status',
  serverManagementActionLimiter,
  requirePermission(...usePermissions),
  getServerManagementStatus
)
