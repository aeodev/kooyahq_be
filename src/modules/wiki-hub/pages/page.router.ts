import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { upload } from '../../../middleware/upload'
import {
  createPage,
  getPage,
  updatePage,
  deletePage,
  listPages,
  searchPages,
  pinPage,
  unpinPage,
  favoritePage,
  unfavoritePage,
  getFavorites,
  getPageVersions,
  restoreVersion,
  compareVersions,
  uploadAttachment,
  deleteAttachment,
} from './page.controller'

export const pageRouter = Router()

// Page CRUD
pageRouter.post('/', authenticate, createPage)
pageRouter.get('/', authenticate, listPages)
pageRouter.get('/search', authenticate, searchPages)
pageRouter.get('/favorites', authenticate, getFavorites)
pageRouter.get('/:id', authenticate, getPage)
pageRouter.put('/:id', authenticate, updatePage)
pageRouter.delete('/:id', authenticate, deletePage)

// Page actions
pageRouter.post('/:id/pin', authenticate, pinPage)
pageRouter.post('/:id/unpin', authenticate, unpinPage)
pageRouter.post('/:id/favorite', authenticate, favoritePage)
pageRouter.post('/:id/unfavorite', authenticate, unfavoritePage)

// Version control
pageRouter.get('/:id/versions', authenticate, getPageVersions)
pageRouter.post('/:id/versions/:versionId/restore', authenticate, restoreVersion)
pageRouter.get('/:id/compare', authenticate, compareVersions)

// Attachments
pageRouter.post('/:id/attachments', authenticate, upload.single('file'), uploadAttachment)
pageRouter.delete('/:id/attachments/:attachmentId', authenticate, deleteAttachment)
