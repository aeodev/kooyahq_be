import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { uploadProfile } from '../../middleware/upload-profile'
import {
  getUserById,
  getAllUsers,
  getProfile,
  updateProfile,
  updateEmployee,
  deleteEmployee,
  createClient,
} from './user.controller'

export const userRouter = Router()

userRouter.get(
  '/profile',
  authenticate,
  requirePermission(PERMISSIONS.USER_READ, PERMISSIONS.USER_FULL_ACCESS),
  getProfile
)
userRouter.put(
  '/profile',
  authenticate,
  requirePermission(PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_FULL_ACCESS),
  uploadProfile.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  updateProfile
)

userRouter.get('/', authenticate, requirePermission(PERMISSIONS.USER_READ, PERMISSIONS.USER_FULL_ACCESS), getAllUsers)
userRouter.get('/:id', authenticate, requirePermission(PERMISSIONS.USER_READ, PERMISSIONS.USER_FULL_ACCESS), getUserById)

userRouter.post(
  '/clients',
  authenticate,
  requirePermission(PERMISSIONS.USER_CREATE, PERMISSIONS.USER_FULL_ACCESS),
  createClient
)
userRouter.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_FULL_ACCESS),
  updateEmployee
)
userRouter.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USER_DELETE, PERMISSIONS.USER_FULL_ACCESS),
  deleteEmployee
)
