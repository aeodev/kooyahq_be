import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { PERMISSIONS, hasPermission } from '../../auth/rbac/permissions'
import type { CreateAdminActivityInput } from '../../admin-activity/admin-activity.repository'
import { adminActivityService } from '../../admin-activity/admin-activity.service'
import { serverManagementService } from './server-management.service'
import { hasSshKeyEncryptionSecret, isEncryptedPrivateKey, normalizeSshKey } from './server-management.ssh'
import type { ActionRisk, ServerManagementAction, ServerManagementServer } from './server-management.model'
import type {
  CreateServerManagementProjectInput,
  CreateServerManagementServerInput,
  CreateServerManagementServiceActionInput,
  ServerManagementActionInput,
  ServerManagementServiceInput,
  UpdateServerManagementActionInput,
  UpdateServerManagementProjectInput,
  UpdateServerManagementServerInput,
} from './server-management.repository'

const ACTION_RISKS: ActionRisk[] = ['normal', 'warning', 'dangerous']

function isActionRisk(value: unknown): value is ActionRisk {
  return typeof value === 'string' && ACTION_RISKS.includes(value as ActionRisk)
}

function logAdminActivity(input: CreateAdminActivityInput) {
  void adminActivityService.logActivity(input).catch((logError) => {
    console.error('Failed to log admin activity:', logError)
  })
}

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
  if (action.risk !== undefined && !isActionRisk(action.risk)) {
    throw createHttpError(400, 'Action risk must be normal, warning, or dangerous')
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

function validateServicePayload(service: Partial<ServerManagementServiceInput>) {
  if (!service.name?.trim()) {
    throw createHttpError(400, 'Service name is required')
  }
  validateActions(service.actions)
}

function validateServices(services?: ServerManagementServiceInput[]) {
  if (!services) return
  if (!Array.isArray(services)) {
    throw createHttpError(400, 'Services must be an array')
  }
  services.forEach((service) => validateServicePayload(service))
}

function summarizeServices(services?: ServerManagementServiceInput[]) {
  if (!services) return undefined
  return services
    .map((service) => service.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 6)
}

function summarizeServiceNames(services?: Array<{ name?: string }>) {
  if (!services) return undefined
  return services
    .map((service) => service.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 6)
}

function normalizeComparable(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).sort()
  }
  return value
}

function valuesEqual(a: unknown, b: unknown) {
  return JSON.stringify(normalizeComparable(a)) === JSON.stringify(normalizeComparable(b))
}

function assignChange(changes: Record<string, unknown>, key: string, fromValue: unknown, toValue: unknown) {
  if (!valuesEqual(fromValue, toValue)) {
    changes[key] = { from: fromValue ?? null, to: toValue ?? null }
  }
}

function buildServerChangeLog(
  updates: UpdateServerManagementServerInput,
  existing?: ServerManagementServer
): Record<string, unknown> | undefined {
  if (!existing) {
    const logChanges: Record<string, unknown> = { ...updates }
    if ('sshKey' in logChanges) {
      logChanges.sshKey = '[redacted]'
    }
    if ('statusCommand' in logChanges) {
      logChanges.statusCommand = '[redacted]'
    }
    if ('services' in logChanges) {
      logChanges.services = summarizeServices(updates.services) ?? '[updated]'
    }
    return Object.keys(logChanges).length ? logChanges : undefined
  }

  const changes: Record<string, unknown> = {}

  if (updates.name !== undefined) assignChange(changes, 'name', existing.name, updates.name)
  if (updates.summary !== undefined) assignChange(changes, 'summary', existing.summary, updates.summary)
  if (updates.host !== undefined) assignChange(changes, 'host', existing.host, updates.host)
  if (updates.port !== undefined) assignChange(changes, 'port', existing.port, updates.port)
  if (updates.user !== undefined) assignChange(changes, 'user', existing.user, updates.user)
  if (updates.appDirectory !== undefined) {
    assignChange(changes, 'appDirectory', existing.appDirectory, updates.appDirectory)
  }
  if (updates.sshKey !== undefined) assignChange(changes, 'sshKey', '[redacted]', '[redacted]')
  if (updates.statusCommand !== undefined) assignChange(changes, 'statusCommand', '[redacted]', '[redacted]')
  if (updates.services !== undefined) {
    assignChange(
      changes,
      'services',
      summarizeServiceNames(existing.services),
      summarizeServices(updates.services)
    )
  }

  return Object.keys(changes).length ? changes : undefined
}

function buildActionChangeLog(
  updates: UpdateServerManagementActionInput,
  existing?: ServerManagementAction
): Record<string, unknown> | undefined {
  if (!existing) {
    const logChanges: Record<string, unknown> = { ...updates }
    if ('command' in logChanges) {
      logChanges.command = '[redacted]'
    }
    return Object.keys(logChanges).length ? logChanges : undefined
  }

  const changes: Record<string, unknown> = {}

  if (updates.name !== undefined) assignChange(changes, 'name', existing.name, updates.name)
  if (updates.description !== undefined) {
    assignChange(changes, 'description', existing.description, updates.description)
  }
  if (updates.command !== undefined) assignChange(changes, 'command', '[redacted]', '[redacted]')
  if (updates.risk !== undefined) assignChange(changes, 'risk', existing.risk, updates.risk)
  if (updates.dangerous !== undefined) {
    const nextRisk = updates.dangerous ? 'dangerous' : 'normal'
    assignChange(changes, 'risk', existing.risk, nextRisk)
  }

  return Object.keys(changes).length ? changes : undefined
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

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'create_server_project',
        targetType: 'server_project',
        targetId: project.id,
        targetLabel: project.name,
        changes: { name: project.name, emoji: project.emoji },
      })
    }

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
    const existingProject = await serverManagementService.findProjectById(projectId)
    const project = await serverManagementService.updateProject(projectId, updates)
    if (!project) {
      return next(createHttpError(404, 'Project not found'))
    }

    if (req.user?.id) {
      const changes: Record<string, unknown> = {}
      if (existingProject) {
        if (updates.name !== undefined) assignChange(changes, 'name', existingProject.name, updates.name)
        if (updates.description !== undefined) {
          assignChange(changes, 'description', existingProject.description, updates.description)
        }
        if (updates.emoji !== undefined) assignChange(changes, 'emoji', existingProject.emoji, updates.emoji)
      } else {
        Object.entries(updates).forEach(([key, value]) => {
          changes[key] = { from: null, to: value ?? null }
        })
      }

      logAdminActivity({
        adminId: req.user.id,
        action: 'update_server_project',
        targetType: 'server_project',
        targetId: projectId,
        targetLabel: project.name,
        changes: Object.keys(changes).length ? changes : undefined,
      })
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
    const existingProject = await serverManagementService.findProjectById(projectId)
    const deleted = await serverManagementService.deleteProject(projectId)
    if (!deleted) {
      return next(createHttpError(404, 'Project not found'))
    }

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'delete_server_project',
        targetType: 'server_project',
        targetId: projectId,
        targetLabel: existingProject?.name,
      })
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
    validateServices(req.body.services)

    const server = await serverManagementService.addServer(projectId, {
      name: req.body.name,
      summary: req.body.summary,
      host: req.body.host,
      port: req.body.port,
      user: req.body.user,
      sshKey,
      statusCommand: req.body.statusCommand,
      appDirectory: req.body.appDirectory,
      services: req.body.services,
    })

    if (!server) {
      return next(createHttpError(404, 'Project not found'))
    }

    if (req.user?.id) {
      const serviceSummary = summarizeServices(req.body.services)
      logAdminActivity({
        adminId: req.user.id,
        action: 'create_server',
        targetType: 'server',
        targetId: server.id,
        targetLabel: server.name,
        changes: {
          name: server.name,
          summary: server.summary,
          host: server.host,
          port: server.port,
          user: server.user,
          ...(serviceSummary ? { services: serviceSummary } : {}),
        },
      })
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

  if (req.body.services !== undefined) {
    validateServices(req.body.services)
    updates.services = req.body.services
  }

  try {
    const existing = await serverManagementService.findServerById(serverId)
    const server = await serverManagementService.updateServer(projectId, serverId, updates)
    if (!server) {
      return next(createHttpError(404, 'Server not found'))
    }

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'update_server',
        targetType: 'server',
        targetId: serverId,
        targetLabel: server.name,
        changes: buildServerChangeLog(updates, existing?.server),
      })
    }

    res.json({ status: 'success', data: server })
  } catch (error) {
    next(error)
  }
}

export async function deleteServerManagementServer(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId } = req.params

  try {
    const existingProject = await serverManagementService.findProjectById(projectId)
    const existingServer = existingProject?.servers.find((server) => server.id === serverId)
    const deleted = await serverManagementService.deleteServer(projectId, serverId)
    if (!deleted) {
      return next(createHttpError(404, 'Server not found'))
    }

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'delete_server',
        targetType: 'server',
        targetId: serverId,
        targetLabel: existingServer?.name,
      })
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
    const serviceName = req.body.serviceName?.trim()
    if (!serviceName) {
      return next(createHttpError(400, 'Service name is required'))
    }

    const action = await serverManagementService.addAction(projectId, serverId, {
      serviceName,
      name: req.body.name,
      description: req.body.description,
      command: req.body.command,
      risk: req.body.risk,
      dangerous: req.body.dangerous,
    } as CreateServerManagementServiceActionInput)

    if (!action) {
      return next(createHttpError(404, 'Service not found'))
    }

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'create_server_action',
        targetType: 'server_action',
        targetId: action.id,
        targetLabel: action.name,
        changes: {
          serviceName,
          name: action.name,
          description: action.description,
          risk: action.risk,
          command: '[redacted]',
        },
      })
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

  if (req.body.risk !== undefined) {
    if (!isActionRisk(req.body.risk)) {
      return next(createHttpError(400, 'Action risk must be normal, warning, or dangerous'))
    }
    updates.risk = req.body.risk
  } else if (req.body.dangerous !== undefined) {
    updates.dangerous = Boolean(req.body.dangerous)
  }

  try {
    const existing = await serverManagementService.findActionByIds(serverId, actionId)
    const action = await serverManagementService.updateAction(projectId, serverId, actionId, updates)
    if (!action) {
      return next(createHttpError(404, 'Action not found'))
    }

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'update_server_action',
        targetType: 'server_action',
        targetId: actionId,
        targetLabel: action.name,
        changes: buildActionChangeLog(updates, existing?.action),
      })
    }

    res.json({ status: 'success', data: action })
  } catch (error) {
    next(error)
  }
}

export async function deleteServerManagementAction(req: Request, res: Response, next: NextFunction) {
  const { projectId, serverId, actionId } = req.params

  try {
    const existing = await serverManagementService.findActionByIds(serverId, actionId)
    const deleted = await serverManagementService.deleteAction(projectId, serverId, actionId)
    if (!deleted) {
      return next(createHttpError(404, 'Action not found'))
    }

    if (req.user?.id) {
      logAdminActivity({
        adminId: req.user.id,
        action: 'delete_server_action',
        targetType: 'server_action',
        targetId: actionId,
        targetLabel: existing?.action.name,
      })
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
    const canActionNormal = hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_ACTION_NORMAL)
    const canActionWarning = hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_ACTION_WARNING)
    const canActionDangerous = hasPermission(user, PERMISSIONS.SERVER_MANAGEMENT_ACTION_DANGEROUS)

    const canRunDangerous = canElevated || canActionDangerous
    const canRunWarning = canRunDangerous || canActionWarning
    const canRunNormal = canRunWarning || canActionNormal || canUse

    const actionRisk = resolved.action.risk ?? 'normal'
    const allowed =
      actionRisk === 'dangerous'
        ? canRunDangerous
        : actionRisk === 'warning'
          ? canRunWarning
          : canRunNormal

    if (!allowed) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const run = serverManagementService.startActionRun({
      userId: user.id,
      server: resolved.server,
      action: resolved.action,
    })

    if (actionRisk === 'warning' || actionRisk === 'dangerous') {
      logAdminActivity({
        adminId: user.id,
        action: 'trigger_server_action',
        targetType: 'server_action',
        targetId: resolved.action.id,
        targetLabel: resolved.action.name,
        changes: {
          risk: actionRisk,
          runId: run.runId,
          serverId: resolved.server.id,
          serverName: resolved.server.name,
        },
      })
    }

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
