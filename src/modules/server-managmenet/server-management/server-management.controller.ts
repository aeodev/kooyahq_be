import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { PERMISSIONS, hasPermission } from '../../auth/rbac/permissions'
import { serverManagementService } from './server-management.service'
import { hasSshKeyEncryptionSecret, isEncryptedPrivateKey, normalizeSshKey } from './server-management.ssh'
import type {
  CreateServerManagementProjectInput,
  CreateServerManagementServerInput,
  ServerManagementActionInput,
  UpdateServerManagementActionInput,
  UpdateServerManagementProjectInput,
  UpdateServerManagementServerInput,
} from './server-management.repository'

function validateProjectPayload(payload: Partial<CreateServerManagementProjectInput>) {
  if (!payload.name?.trim()) {
    throw createHttpError(400, 'Project name is required')
  }
  if (!payload.description?.trim()) {
    throw createHttpError(400, 'Project description is required')
  }
  if (!payload.emoji?.trim()) {
    throw createHttpError(400, 'Project emoji is required')
  }
}

function validateServerPayload(payload: Partial<CreateServerManagementServerInput>) {
  if (!payload.name?.trim()) {
    throw createHttpError(400, 'Server name is required')
  }
  if (!payload.summary?.trim()) {
    throw createHttpError(400, 'Server summary is required')
  }
  if (!payload.host?.trim()) {
    throw createHttpError(400, 'Server host is required')
  }
}

function validateActionPayload(action: Partial<ServerManagementActionInput>) {
  if (!action.name?.trim()) {
    throw createHttpError(400, 'Action name is required')
  }
  if (!action.description?.trim()) {
    throw createHttpError(400, 'Action description is required')
  }
  if (!action.command?.trim()) {
    throw createHttpError(400, 'Action command is required')
  }
}

function validateSshKeyInput(sshKey?: string) {
  const normalized = normalizeSshKey(sshKey)
  if (!normalized) return
  if (!hasSshKeyEncryptionSecret()) {
    throw createHttpError(500, 'SSH key encryption is not configured')
  }
  if (isEncryptedPrivateKey(normalized)) {
    throw createHttpError(400, 'Encrypted SSH keys are not supported. Provide an unencrypted key.')
  }
}

function validateActions(actions?: ServerManagementActionInput[]) {
  if (!actions) return
  if (!Array.isArray(actions)) {
    throw createHttpError(400, 'Actions must be an array')
  }
  actions.forEach((action) => validateActionPayload(action))
}

export async function getServerManagementProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await serverManagementService.findAllProjects()
    res.json({ status: 'success', data: projects })
  } catch (error) {
    next(error)
  }
}

export async function getServerManagementProject(req: Request, res: Response, next: NextFunction) {
  const { projectId } = req.params

  try {
    const project = await serverManagementService.findProjectById(projectId)
    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({ status: 'success', data: project })
  } catch (error) {
    next(error)
  }
}

export async function createServerManagementProject(req: Request, res: Response, next: NextFunction) {
  try {
    validateProjectPayload(req.body)

    const project = await serverManagementService.createProject({
      name: req.body.name,
      description: req.body.description,
      emoji: req.body.emoji,
    })

    res.status(201).json({ status: 'success', data: project })
  } catch (error: any) {
    if (error?.statusCode) {
      return next(error)
    }
    if (error?.code === 11000 || error?.message?.includes('duplicate')) {
      return next(createHttpError(409, 'Project with this name already exists'))
    }
    next(error)
  }
}

export async function updateServerManagementProject(req: Request, res: Response, next: NextFunction) {
  const { projectId } = req.params
  const updates: UpdateServerManagementProjectInput = {}

  if (req.body.name !== undefined) {
    if (!req.body.name?.trim()) {
      return next(createHttpError(400, 'Project name cannot be empty'))
    }
    updates.name = req.body.name
  }

  if (req.body.description !== undefined) {
    if (!req.body.description?.trim()) {
      return next(createHttpError(400, 'Project description cannot be empty'))
    }
    updates.description = req.body.description
  }

  if (req.body.emoji !== undefined) {
    if (!req.body.emoji?.trim()) {
      return next(createHttpError(400, 'Project emoji cannot be empty'))
    }
    updates.emoji = req.body.emoji
  }

  try {
    const project = await serverManagementService.updateProject(projectId, updates)
    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({ status: 'success', data: project })
  } catch (error: any) {
    if (error?.code === 11000 || error?.message?.includes('duplicate')) {
      return next(createHttpError(409, 'Project with this name already exists'))
    }
    next(error)
  }
}

export async function deleteServerManagementProject(req: Request, res: Response, next: NextFunction) {
  const { projectId } = req.params

  try {
    const deleted = await serverManagementService.deleteProject(projectId)
    if (!deleted) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.json({ status: 'success', message: 'Project deleted' })
  } catch (error) {
    next(error)
  }
}

export async function createServerManagementServer(req: Request, res: Response, next: NextFunction) {
  const { projectId } = req.params

  try {
    validateServerPayload(req.body)
    const sshKey =
      typeof req.body.sshKey === 'string' && req.body.sshKey.trim().length > 0
        ? req.body.sshKey
        : undefined
    validateSshKeyInput(sshKey)
    validateActions(req.body.actions)

    const server = await serverManagementService.addServer(projectId, {
      name: req.body.name,
      summary: req.body.summary,
      host: req.body.host,
      port: req.body.port,
      user: req.body.user,
      sshKey,
      statusCommand: req.body.statusCommand,
      appDirectory: req.body.appDirectory,
      actions: req.body.actions,
    })

    if (!server) {
      return next(createHttpError(404, 'Project not found'))
    }

    res.status(201).json({ status: 'success', data: server })
  } catch (error) {
    next(error)
  }
}

export async function updateServerManagementServer(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId } = req.params
  const updates: UpdateServerManagementServerInput = {}

  if (req.body.name !== undefined) {
    if (!req.body.name?.trim()) {
      return next(createHttpError(400, 'Server name cannot be empty'))
    }
    updates.name = req.body.name
  }

  if (req.body.summary !== undefined) {
    if (!req.body.summary?.trim()) {
      return next(createHttpError(400, 'Server summary cannot be empty'))
    }
    updates.summary = req.body.summary
  }

  if (req.body.host !== undefined) {
    if (!req.body.host?.trim()) {
      return next(createHttpError(400, 'Server host cannot be empty'))
    }
    updates.host = req.body.host
  }

  if (req.body.port !== undefined) {
    updates.port = req.body.port
  }

  if (req.body.user !== undefined) {
    updates.user = req.body.user
  }

  if (typeof req.body.sshKey === 'string' && req.body.sshKey.trim().length > 0) {
    validateSshKeyInput(req.body.sshKey)
    updates.sshKey = req.body.sshKey
  }

  if (req.body.statusCommand !== undefined) {
    updates.statusCommand = req.body.statusCommand
  }

  if (req.body.appDirectory !== undefined) {
    updates.appDirectory = req.body.appDirectory
  }

  if (req.body.actions !== undefined) {
    validateActions(req.body.actions)
    updates.actions = req.body.actions
  }

  try {
    const server = await serverManagementService.updateServer(projectId, serverId, updates)
    if (!server) {
      return next(createHttpError(404, 'Server not found'))
    }

    res.json({ status: 'success', data: server })
  } catch (error) {
    next(error)
  }
}

export async function deleteServerManagementServer(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId } = req.params

  try {
    const deleted = await serverManagementService.deleteServer(projectId, serverId)
    if (!deleted) {
      return next(createHttpError(404, 'Server not found'))
    }

    res.json({ status: 'success', message: 'Server deleted' })
  } catch (error) {
    next(error)
  }
}

export async function createServerManagementAction(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId } = req.params

  try {
    validateActionPayload(req.body)

    const action = await serverManagementService.addAction(projectId, serverId, {
      name: req.body.name,
      description: req.body.description,
      command: req.body.command,
      dangerous: req.body.dangerous,
    })

    if (!action) {
      return next(createHttpError(404, 'Server not found'))
    }

    res.status(201).json({ status: 'success', data: action })
  } catch (error) {
    next(error)
  }
}

export async function updateServerManagementAction(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId, actionId } = req.params
  const updates: UpdateServerManagementActionInput = {}

  if (req.body.name !== undefined) {
    if (!req.body.name?.trim()) {
      return next(createHttpError(400, 'Action name cannot be empty'))
    }
    updates.name = req.body.name
  }

  if (req.body.description !== undefined) {
    if (!req.body.description?.trim()) {
      return next(createHttpError(400, 'Action description cannot be empty'))
    }
    updates.description = req.body.description
  }

  if (req.body.command !== undefined) {
    if (!req.body.command?.trim()) {
      return next(createHttpError(400, 'Action command cannot be empty'))
    }
    updates.command = req.body.command
  }

  if (req.body.dangerous !== undefined) {
    updates.dangerous = Boolean(req.body.dangerous)
  }

  try {
    const action = await serverManagementService.updateAction(projectId, serverId, actionId, updates)
    if (!action) {
      return next(createHttpError(404, 'Action not found'))
    }

    res.json({ status: 'success', data: action })
  } catch (error) {
    next(error)
  }
}

export async function deleteServerManagementAction(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId, actionId } = req.params

  try {
    const deleted = await serverManagementService.deleteAction(projectId, serverId, actionId)
    if (!deleted) {
      return next(createHttpError(404, 'Action not found'))
    }

    res.json({ status: 'success', message: 'Action deleted' })
  } catch (error) {
    next(error)
  }
}

export async function runServerManagementAction(req: Request, res: Response, next: NextFunction) {
  const { serverId, actionId } = req.params
  const user = req.user

  if (!user?.id) {
    return next(createHttpError(401, 'Authentication required'))
  }

  try {
    const resolved = await serverManagementService.findActionByIds(serverId, actionId)
    if (!resolved) {
      return next(createHttpError(404, 'Action not found'))
    }

    if (!resolved.server.host?.trim()) {
      return next(createHttpError(400, 'Server host is missing'))
    }

    if (!resolved.server.sshKey?.trim()) {
      return next(createHttpError(400, 'Server SSH key is missing'))
    }

    if (!resolved.action.command?.trim()) {
      return next(createHttpError(400, 'Action command is missing'))
    }

    const canManage = hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_MANAGE)
    const canElevated = canManage || hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE)
    const canUse = canElevated || hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_USE)

    if (!canUse) {
      return next(createHttpError(403, 'Forbidden'))
    }

    if (resolved.action.dangerous && !canElevated) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const run = serverManagementService.startActionRun({
      userId: user.id,
      server: resolved.server,
      action: resolved.action,
    })

    res.status(202).json({
      status: 'success',
      data: {
        runId: run.runId,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getServerManagementStatus(req: Request, res: Response, next: NextFunction) {
  const { serverId } = req.params
  const user = req.user

  if (!user?.id) {
    return next(createHttpError(401, 'Authentication required'))
  }

  try {
    const resolved = await serverManagementService.findServerById(serverId)
    if (!resolved) {
      return next(createHttpError(404, 'Server not found'))
    }

    if (!resolved.server.host?.trim()) {
      return next(createHttpError(400, 'Server host is missing'))
    }

    if (!resolved.server.sshKey?.trim()) {
      return next(createHttpError(400, 'Server SSH key is missing'))
    }

    if (!resolved.server.statusCommand?.trim()) {
      return next(createHttpError(400, 'Status command is missing'))
    }

    const canManage = hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_MANAGE)
    const canElevated = canManage || hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE)
    const canUse = canElevated || hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_USE)

    if (!canUse) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const result = await serverManagementService.fetchServerStatus(resolved.server)

    res.json({
      status: 'success',
      data: {
        status: result.status,
        rawOutput: result.rawOutput,
      },
    })
  } catch (error) {
    next(error)
  }
}
