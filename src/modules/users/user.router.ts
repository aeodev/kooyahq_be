import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requireAdmin } from '../../middleware/require-admin'
import { uploadProfile } from '../../middleware/upload-profile'
import { getUserById, getAllUsers, getProfile, updateProfile, updateEmployee, serveProfileFile } from './user.controller'

export const userRouter = Router()

userRouter.get('/files/:filename', serveProfileFile)
userRouter.get('/profile', authenticate, getProfile)
userRouter.put('/profile', authenticate, uploadProfile.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), updateProfile)

userRouter.get('/', authenticate, getAllUsers)
userRouter.get('/:id', authenticate, getUserById)

// Admin routes - require admin access
userRouter.put('/:id', authenticate, requireAdmin, updateEmployee)
