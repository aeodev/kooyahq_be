import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requireAdmin } from '../../middleware/require-admin'
import { upload } from '../../middleware/upload'
import {
  createGalleryItem,
  createMultipleGalleryItems,
  getGalleryItems,
  getGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  serveGalleryFile,
} from './gallery.controller'

export const galleryRouter = Router()

// Public route to serve gallery files (CORS handled by global middleware)
galleryRouter.get('/files/:filename', serveGalleryFile)

// Viewing routes - require authentication but not admin
galleryRouter.use(authenticate)
galleryRouter.get('/', getGalleryItems)
galleryRouter.get('/:id', getGalleryItem)

// Modification routes - require admin access
galleryRouter.use(requireAdmin)
galleryRouter.post('/', upload.single('image'), createGalleryItem)
galleryRouter.post('/multiple', upload.array('images', 20), createMultipleGalleryItems)
galleryRouter.put('/:id', updateGalleryItem)
galleryRouter.delete('/:id', deleteGalleryItem)

