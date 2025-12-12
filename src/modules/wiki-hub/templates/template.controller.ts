import type { NextFunction, Request, Response } from 'express'
import { templateRepository, type CreateTemplateInput } from './template.repository'
import { pageService } from '../pages/page.service'
import { createHttpError } from '../../../utils/http-error'

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { name, workspaceId, fieldsStructure, defaultContent, category } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!name || !category) {
    return next(createHttpError(400, 'Name and category are required'))
  }

  try {
    const template = await templateRepository.create({
      name: name.trim(),
      workspaceId,
      fieldsStructure: fieldsStructure || {},
      defaultContent: defaultContent || {},
      category,
    })

    res.status(201).json({
      success: true,
      data: template,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTemplates(req: Request, res: Response, next: NextFunction) {
  const { workspaceId, category } = req.query
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    let templates

    if (category && typeof category === 'string') {
      templates = await templateRepository.findByCategory(
        category as 'sop' | 'meeting' | 'project' | 'bug' | 'strategy',
        workspaceId as string | undefined,
      )
    } else if (workspaceId && typeof workspaceId === 'string') {
      templates = await templateRepository.findAll(workspaceId)
    } else {
      templates = await templateRepository.findGlobal()
    }

    res.json({
      success: true,
      data: templates,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const template = await templateRepository.findById(id)

    if (!template) {
      return next(createHttpError(404, 'Template not found'))
    }

    res.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id
  const { name, fieldsStructure, defaultContent, category } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const template = await templateRepository.update(id, {
      name: name?.trim(),
      fieldsStructure,
      defaultContent,
      category,
    })

    if (!template) {
      return next(createHttpError(404, 'Template not found'))
    }

    res.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const deleted = await templateRepository.delete(id)

    if (!deleted) {
      return next(createHttpError(404, 'Template not found'))
    }

    res.json({
      success: true,
      message: 'Template deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function createPageFromTemplate(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id
  const { workspaceId, title, parentPageId } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!workspaceId || !title) {
    return next(createHttpError(400, 'Workspace ID and title are required'))
  }

  try {
    const template = await templateRepository.findById(id)

    if (!template) {
      return next(createHttpError(404, 'Template not found'))
    }

    const page = await pageService.createPage(
      {
        workspaceId,
        title: title.trim(),
        content: template.defaultContent,
        parentPageId,
        templateId: id,
        category: template.category,
      },
      userId,
    )

    res.status(201).json({
      success: true,
      data: page,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message.includes('not a member')) {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}
