import type { NextFunction, Request, Response } from 'express'
import { workspaceService } from './workspace.service'
import { createHttpError } from '../../../utils/http-error'

export async function createWorkspace(req: Request, res: Response, next: NextFunction) {
  const { name, slug, members } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Clients cannot create workspaces
  if (req.user?.userType === 'client') {
    return next(createHttpError(403, 'Clients cannot create workspaces'))
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(createHttpError(400, 'Workspace name is required'))
  }

  try {
    const workspace = await workspaceService.create({
      name: name.trim(),
      slug: slug || name.trim(),
      members: members || [{ userId, role: 'owner', joinedAt: new Date() }],
    })

    res.status(201).json({
      success: true,
      data: workspace,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getWorkspaces(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const workspaces = await workspaceService.findByUserId(userId)

    res.json({
      success: true,
      data: workspaces,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getWorkspaceById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const workspace = await workspaceService.findById(id)

    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }

    // Check if user is a member
    const isMember = workspace.members.some((m) => m.userId === userId)
    if (!isMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    res.json({
      success: true,
      data: workspace,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateWorkspace(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { timestamp, data } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!timestamp) {
    return next(createHttpError(400, 'Timestamp is required'))
  }

  try {
    const workspace = await workspaceService.findById(id)

    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }

    // Clients cannot update workspace settings
    if (req.user?.userType === 'client') {
      return next(createHttpError(403, 'Clients cannot update workspace settings'))
    }

    // Check permissions - user must be owner or admin
    const userMember = workspace.members.find((m) => m.userId === userId)
    if (!userMember || userMember.role === 'member') {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates: any = {}
    if (data.name !== undefined) {
      updates.name = data.name.trim()
    }
    if (data.slug !== undefined) {
      updates.slug = data.slug.trim().toLowerCase()
    }
    if (data.members !== undefined) {
      updates.members = Array.isArray(data.members) ? data.members : []
    }

    const updated = await workspaceService.update(id, updates)

    if (!updated) {
      return next(createHttpError(404, 'Workspace not found'))
    }

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Clients cannot delete workspaces
  if (req.user?.userType === 'client') {
    return next(createHttpError(403, 'Clients cannot delete workspaces'))
  }

  try {
    const workspace = await workspaceService.findById(id)

    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }

    // Check permissions - user must be owner
    const userMember = workspace.members.find((m) => m.userId === userId)
    if (!userMember || userMember.role !== 'owner') {
      return next(createHttpError(403, 'Forbidden'))
    }

    await workspaceService.delete(id)

    res.json({
      success: true,
      message: 'Workspace deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

