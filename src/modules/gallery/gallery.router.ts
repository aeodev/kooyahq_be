import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { upload } from '../../middleware/upload'
import {
  createGalleryItem,
  createMultipleGalleryItems,
  getGalleryItems,
  getGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from './gallery.controller'

export const galleryRouter = Router()

galleryRouter.use(authenticate)

galleryRouter.get('/', requirePermission(PERMISSIONS.GALLERY_READ, PERMISSIONS.GALLERY_FULL_ACCESS), getGalleryItems)
galleryRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.GALLERY_READ, PERMISSIONS.GALLERY_FULL_ACCESS),
  getGalleryItem
)
galleryRouter.post(
  '/',
  requirePermission(PERMISSIONS.GALLERY_CREATE, PERMISSIONS.GALLERY_FULL_ACCESS),
  upload.single('image'),
  createGalleryItem
)
galleryRouter.post(
  '/multiple',
  requirePermission(PERMISSIONS.GALLERY_BULK_CREATE, PERMISSIONS.GALLERY_FULL_ACCESS),
  upload.array('images', 20),
  createMultipleGalleryItems
)
galleryRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.GALLERY_UPDATE, PERMISSIONS.GALLERY_FULL_ACCESS),
  updateGalleryItem
)
galleryRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.GALLERY_DELETE, PERMISSIONS.GALLERY_FULL_ACCESS),
  deleteGalleryItem
)
