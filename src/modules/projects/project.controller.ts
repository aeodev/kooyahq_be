import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../utils/http-error'
import { projectService } from './project.service'
import { adminActivityService } from '../admin-activity/admin-activity.service'

export async function createProject(req: Request, res: Response, next: NextFunction) {
  const { name, emoji, iconUrl } = req.body

  if (!name || !name.trim()) {
    return next(createHttpError(400, 'Project name is required'))
  }

  try {
    const project = await projectService.create({
      name: name.trim(),
      emoji: emoji?.trim(),
      iconUrl: iconUrl?.trim(),
    })

    // Log admin activity
    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'create_project',
          targetType: 'project',
          targetId: project.id,
          targetLabel: project.name,
          changes: { name: project.name },
        })
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.status(201).json({
      status: 'success',
      data: project,
    })
  } catch (error: any) {
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return next(createHttpError(409, 'Project with this name already exists'))
    }
    next(error)
  }
}

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectService.findAll()

    res.json({
      status: 'success',
      data: projects,
    })
  } catch (error) {
    next(error)
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id

  try {
    const project = await projectService.findById(id)

    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({
      status: 'success',
      data: project,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id
  const { name, emoji, iconUrl } = req.body

  if (name !== undefined && !name.trim()) {
    return next(createHttpError(400, 'Project name cannot be empty'))
  }

  try {
    const existingProject = await projectService.findById(id)
    if (!existingProject) {
      return next(createHttpError(404, 'Project not found'))
    }

    const updates: any = {}
    if (name !== undefined) {
      updates.name = name.trim()
    }
    if (emoji !== undefined) {
      updates.emoji = emoji?.trim() || null
    }
    if (iconUrl !== undefined) {
      updates.iconUrl = iconUrl?.trim() || null
    }

    const project = await projectService.update(id, updates)

    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    // Log admin activity
    if (req.user?.id) {
      try {
        const changes: Record<string, unknown> = {}
        if (updates.name !== undefined && updates.name !== existingProject.name) {
          changes.name = { from: existingProject.name, to: updates.name }
        }
        if (updates.emoji !== undefined && updates.emoji !== existingProject.emoji) {
          changes.emoji = { from: existingProject.emoji || null, to: updates.emoji || null }
        }
        if (updates.iconUrl !== undefined && updates.iconUrl !== existingProject.iconUrl) {
          changes.iconUrl = { from: existingProject.iconUrl || null, to: updates.iconUrl || null }
        }
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'update_project',
          targetType: 'project',
          targetId: id,
          targetLabel: project.name,
          changes: Object.keys(changes).length ? changes : undefined,
        })
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.json({
      status: 'success',
      data: project,
    })
  } catch (error: any) {
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return next(createHttpError(409, 'Project with this name already exists'))
    }
    next(error)
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id

  try {
    const existingProject = await projectService.findById(id)
    const deleted = await projectService.delete(id)

    if (!deleted) {
      return next(createHttpError(404, 'Project not found'))
    }

    // Log admin activity
    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'delete_project',
          targetType: 'project',
          targetId: id,
          targetLabel: existingProject?.name,
        })
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.json({
      status: 'success',
      message: 'Project deleted',
    })
  } catch (error) {
    next(error)
  }
}



