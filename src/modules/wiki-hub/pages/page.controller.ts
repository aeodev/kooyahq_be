import type { NextFunction, Request, Response } from 'express'
import { pageService } from './page.service'
import { pageVersionService } from '../versions/page-version.service'
import { createHttpError } from '../../../utils/http-error'
import { upload } from '../../../middleware/upload'
import { PageAttachmentModel, toPageAttachment } from './page-attachment.model'
import { activityRepository } from '../../workspace/activities/activity.repository'
import {
  requireAuth,
  sendResponse,
  handleControllerError,
  validateQueryParam,
  validateBodyField,
} from '../utils/controller-helpers'

export async function createPage(req: Request, res: Response, next: NextFunction) {
  const userId = requireAuth(req, next)
  if (!userId) return

  const workspaceId = validateBodyField(req, 'workspaceId', next)
  const title = validateBodyField(req, 'title', next)
  if (!workspaceId || !title) return

  try {
    const { content, parentPageId, status, templateId, tags, category } = req.body

    const page = await pageService.createPage(
      {
        workspaceId,
        title: title.trim(),
        content: content || {},
        parentPageId,
        status: status || 'published',
        templateId,
        tags: tags || [],
        category,
      },
      userId,
    )

    // Create activity log
    try {
      await activityRepository.create({
        workspaceId,
        boardId: '',
        actorId: userId,
        actionType: 'create',
        changes: [
          {
            field: 'page',
            oldValue: null,
            newValue: page.title,
            text: `created page "${page.title}"`,
          },
        ],
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    return sendResponse(res, page, 201)
  } catch (error: any) {
    handleControllerError(error, next, 'Failed to create page')
  }
}

export async function getPage(req: Request, res: Response, next: NextFunction) {
  const userId = requireAuth(req, next)
  if (!userId) return

  const { id } = req.params

  try {
    const page = await pageService.getPage(id, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }
    return sendResponse(res, page)
  } catch (error: any) {
    handleControllerError(error, next, 'Failed to get page')
  }
}

export async function updatePage(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id
  const { title, content, parentPageId, status, templateId, tags, category } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const oldPage = await pageService.getPage(id, userId)
    if (!oldPage) {
      return next(createHttpError(404, 'Page not found'))
    }

    const page = await pageService.updatePage(
      id,
      {
        title: title?.trim(),
        content,
        parentPageId,
        status,
        templateId,
        tags,
        category,
      },
      userId,
    )

    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    // Create activity log
    const changes: Array<{
      field: string
      oldValue: any
      newValue: any
      text: string
    }> = []

    if (title && title.trim() !== oldPage.title) {
      changes.push({
        field: 'title',
        oldValue: oldPage.title,
        newValue: title.trim(),
        text: `changed title from "${oldPage.title}" to "${title.trim()}"`,
      })
    }
    if (content !== undefined) {
      changes.push({
        field: 'content',
        oldValue: oldPage.content,
        newValue: content,
        text: 'updated content',
      })
    }
    if (status && status !== oldPage.status) {
      changes.push({
        field: 'status',
        oldValue: oldPage.status,
        newValue: status,
        text: `changed status from ${oldPage.status} to ${status}`,
      })
    }

    if (changes.length > 0) {
      try {
        await activityRepository.create({
          workspaceId: page.workspaceId,
          boardId: '', // Pages don't have boards
          actorId: userId,
          actionType: 'update',
          changes,
        })
      } catch (activityError) {
        console.error('Failed to create activity:', activityError)
      }
    }

    res.json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function deletePage(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageService.getPage(id, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const deleted = await pageService.deletePage(id, userId)

    if (!deleted) {
      return next(createHttpError(404, 'Page not found'))
    }

    // Create activity log
    try {
      await activityRepository.create({
        workspaceId: page.workspaceId,
        boardId: '', // Pages don't have boards
        actorId: userId,
        actionType: 'delete',
        changes: [
          {
            field: 'page',
            oldValue: page.title,
            newValue: null,
            text: `deleted page "${page.title}"`,
          },
        ],
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    res.json({
      success: true,
      message: 'Page deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function listPages(req: Request, res: Response, next: NextFunction) {
  const userId = requireAuth(req, next)
  if (!userId) return

  const workspaceId = validateQueryParam(req, 'workspaceId', next)
  if (!workspaceId) return

  try {
    const pages = await pageService.listPages(workspaceId, userId)
    return sendResponse(res, pages)
  } catch (error: any) {
    handleControllerError(error, next, 'Failed to list pages')
  }
}

export async function searchPages(req: Request, res: Response, next: NextFunction) {
  const userId = requireAuth(req, next)
  if (!userId) return

  const workspaceId = validateQueryParam(req, 'workspaceId', next)
  const q = validateQueryParam(req, 'q', next)
  if (!workspaceId || !q) return

  try {
    const pages = await pageService.searchPages(workspaceId, q, userId)
    return sendResponse(res, pages)
  } catch (error: any) {
    handleControllerError(error, next, 'Failed to search pages')
  }
}

export async function pinPage(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageService.pinPage(id, userId)

    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    res.json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function unpinPage(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageService.unpinPage(id, userId)

    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    res.json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function favoritePage(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageService.favoritePage(id, userId)

    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    res.json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function unfavoritePage(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageService.unfavoritePage(id, userId)

    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    res.json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    next(error)
  }
}

export async function getFavorites(req: Request, res: Response, next: NextFunction) {
  const { workspaceId } = req.query
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!workspaceId || typeof workspaceId !== 'string') {
    return next(createHttpError(400, 'Workspace ID is required'))
  }

  try {
    const pages = await pageService.getFavorites(workspaceId, userId)

    res.json({
      success: true,
      data: pages,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('not a member')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function getPageVersions(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const versions = await pageVersionService.getVersionHistory(id, userId)

    res.json({
      success: true,
      data: versions,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function restoreVersion(req: Request, res: Response, next: NextFunction) {
  const { id, versionId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageVersionService.restoreVersion(id, versionId, userId)

    if (!page) {
      return next(createHttpError(404, 'Page or version not found'))
    }

    res.json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function compareVersions(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { version1, version2 } = req.query
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!version1 || !version2 || typeof version1 !== 'string' || typeof version2 !== 'string') {
    return next(createHttpError(400, 'Both version numbers are required'))
  }

  try {
    const comparison = await pageVersionService.compareVersions(id, version1, version2, userId)

    res.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function uploadAttachment(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!file) {
    return next(createHttpError(400, 'File is required'))
  }

  try {
    const page = await pageService.getPage(id, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const url = (file as any).cloudinaryUrl || ''
    if (!url) {
      return next(createHttpError(500, 'Failed to upload file'))
    }

    // Determine file type
    const mimeType = file.mimetype
    let type: 'image' | 'video' | 'pdf' | 'other' = 'other'
    if (mimeType.startsWith('image/')) type = 'image'
    else if (mimeType.startsWith('video/')) type = 'video'
    else if (mimeType === 'application/pdf') type = 'pdf'

    const attachment = await PageAttachmentModel.create({
      pageId: id,
      type,
      fileUrl: url,
      name: file.originalname,
      size: file.size,
      uploadedBy: userId,
      uploadedAt: new Date(),
    })

    res.json({
      success: true,
      data: toPageAttachment(attachment),
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  const { id, attachmentId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const page = await pageService.getPage(id, userId)
    if (!page) {
      return next(createHttpError(404, 'Page not found'))
    }

    const attachment = await PageAttachmentModel.findById(attachmentId)
    if (!attachment || attachment.pageId !== id) {
      return next(createHttpError(404, 'Attachment not found'))
    }

    // Check if user can edit the page
    const canEdit = await pageService.canEdit(id, userId, page.workspaceId)
    if (!canEdit && attachment.uploadedBy !== userId) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await PageAttachmentModel.findByIdAndDelete(attachmentId)

    res.json({
      success: true,
      message: 'Attachment deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('permission')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}
