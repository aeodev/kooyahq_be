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
  getProfile
)
userRouter.put(
  '/profile',
  authenticate,
  uploadProfile.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  updateProfile
)

userRouter.get('/', authenticate, requirePermission(PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE), getAllUsers)
userRouter.get('/:id', authenticate, requirePermission(PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE), getUserById)

userRouter.post(
  '/clients',
  authenticate,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  createClient
)
userRouter.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  updateEmployee
)
userRouter.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  deleteEmployee
)
