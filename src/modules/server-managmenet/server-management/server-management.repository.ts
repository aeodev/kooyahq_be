import { randomUUID } from 'node:crypto'
import {
  ServerManagementProjectV2Model,
  toServerManagementProject,
  type ActionRisk,
  type ServerManagementAction,
  type ServerManagementProject,
  type ServerManagementProjectDocument,
  type ServerManagementServer,
  type ServerManagementService,
} from './server-management.model'
import { decryptSshKey, prepareSshKeyForStorage } from './server-management.ssh'

export type CreateServerManagementProjectInput = {
  name: string
  description: string
  emoji: string
}

export type UpdateServerManagementProjectInput = {
  name?: string
  description?: string
  emoji?: string
}

export type ServerManagementActionInput = {
  id?: string
  name: string
  description: string
  command: string
  risk?: ActionRisk
  dangerous?: boolean
}

export type ServerManagementServiceInput = {
  name: string
  serviceName?: string
  actions?: ServerManagementActionInput[]
}

export type CreateServerManagementServiceActionInput = ServerManagementActionInput & {
  serviceName: string
}

export type CreateServerManagementServerInput = {
  name: string
  summary: string
  host: string
  port?: string
  user?: string
  sshKey?: string
  statusCommand?: string
  appDirectory?: string
  services?: ServerManagementServiceInput[]
}

export type UpdateServerManagementServerInput = Partial<CreateServerManagementServerInput> & {
  services?: ServerManagementServiceInput[]
}

export type UpdateServerManagementActionInput = {
  name?: string
  description?: string
  command?: string
  risk?: ActionRisk
  dangerous?: boolean
}

function trimValue(value?: string) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

type ServerSnapshotSource = ServerManagementServer | { toObject: () => ServerManagementServer }

function hasToObject(server: ServerSnapshotSource): server is { toObject: () => ServerManagementServer } {
  return typeof (server as { toObject?: () => ServerManagementServer }).toObject === 'function'
}

function toServerSnapshot(server: ServerSnapshotSource): ServerManagementServer {
  const source = hasToObject(server) ? server.toObject() : server

  return {
    id: source.id,
    name: source.name,
    summary: source.summary,
    host: source.host,
    port: source.port,
    user: source.user,
    sshKey: source.sshKey,
    statusCommand: source.statusCommand,
    appDirectory: source.appDirectory,
    services: (source.services || []).map((service) => ({
      name: service.name,
      serviceName: service.serviceName ?? '',
      actions: (service.actions || []).map((action) => ({
        id: action.id,
        name: action.name,
        description: action.description,
        command: action.command,
        risk: action.risk ?? 'normal',
      })),
    })),
  }
}

function toServerWithSshKey(server: ServerManagementServer): ServerManagementServer {
  const snapshot = toServerSnapshot(server)
  return {
    ...snapshot,
    sshKey: decryptSshKey(snapshot.sshKey),
  }
}

function toServerWithoutSshKey(server: ServerManagementServer): ServerManagementServer {
  const snapshot = toServerSnapshot(server)
  return {
    ...snapshot,
    sshKey: undefined,
  }
}

const ACTION_RISKS: ActionRisk[] = ['normal', 'warning', 'dangerous']

function normalizeRisk(input: { risk?: ActionRisk; dangerous?: boolean }): ActionRisk {
  if (input.risk && ACTION_RISKS.includes(input.risk)) {
    return input.risk
  }
  if (input.dangerous) {
    return 'dangerous'
  }
  return 'normal'
}

function buildAction(input: ServerManagementActionInput): ServerManagementAction {
  return {
    id: input.id?.trim() || randomUUID(),
    name: input.name.trim(),
    description: input.description.trim(),
    command: input.command.trim(),
    risk: normalizeRisk(input),
  }
}

function normalizeActions(inputs?: ServerManagementActionInput[]): ServerManagementAction[] {
  if (!inputs) return []
  return inputs.map(buildAction)
}

function buildService(input: ServerManagementServiceInput): ServerManagementService {
  return {
    name: input.name.trim(),
    serviceName: trimValue(input.serviceName) ?? '',
    actions: normalizeActions(input.actions),
  }
}

function normalizeServices(inputs?: ServerManagementServiceInput[]): ServerManagementService[] {
  if (!inputs) return []
  return inputs.map(buildService)
}

function findServiceByName(services: ServerManagementService[], serviceName: string): ServerManagementService | undefined {
  const normalized = serviceName.trim()
  return services.find((service) => service.serviceName === normalized)
}

function findActionInServices(
  services: ServerManagementService[],
  actionId: string
): { service: ServerManagementService; action: ServerManagementAction } | undefined {
  for (const service of services) {
    const action = service.actions.find((item) => item.id === actionId)
    if (action) {
      return { service, action }
    }
  }
  return undefined
}

export const serverManagementRepository = {
  async createProject(input: CreateServerManagementProjectInput): Promise<ServerManagementProject> {
    const doc = await ServerManagementProjectV2Model.create({
      name: input.name.trim(),
      description: input.description.trim(),
      emoji: input.emoji.trim(),
      servers: [],
    })
    return toServerManagementProject(doc)
  },

  async findAllProjects(): Promise<ServerManagementProject[]> {
    const docs = await ServerManagementProjectV2Model.find().sort({ name: 1 }).exec()
    return docs.map(toServerManagementProject)
  },

  async findProjectById(id: string): Promise<ServerManagementProject | undefined> {
    const doc = await ServerManagementProjectV2Model.findById(id).exec()
    return doc ? toServerManagementProject(doc) : undefined
  },

  async updateProject(id: string, updates: UpdateServerManagementProjectInput): Promise<ServerManagementProject | undefined> {
    const updateData: UpdateServerManagementProjectInput = {}
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim()
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim()
    }
    if (updates.emoji !== undefined) {
      updateData.emoji = updates.emoji.trim()
    }

    const doc = await ServerManagementProjectV2Model.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toServerManagementProject(doc) : undefined
  },

  async deleteProject(id: string): Promise<boolean> {
    const result = await ServerManagementProjectV2Model.deleteOne({ _id: id }).exec()
    return result.deletedCount > 0
  },

  async addServer(
    projectId: string,
    input: CreateServerManagementServerInput
  ): Promise<ServerManagementServer | undefined> {
    const doc = await ServerManagementProjectV2Model.findById(projectId).exec()
    if (!doc) return undefined

    const { stored: storedSshKey } = prepareSshKeyForStorage(input.sshKey)
    const server: ServerManagementServer = {
      id: randomUUID(),
      name: input.name.trim(),
      summary: input.summary.trim(),
      host: input.host.trim(),
      port: trimValue(input.port),
      user: trimValue(input.user),
      sshKey: storedSshKey,
      statusCommand: trimValue(input.statusCommand),
      appDirectory: trimValue(input.appDirectory),
      services: normalizeServices(input.services),
    }

    doc.servers.push(server)
    doc.markModified('servers')
    await doc.save()

    return toServerWithoutSshKey(server)
  },

  async updateServer(
    projectId: string,
    serverId: string,
    updates: UpdateServerManagementServerInput
  ): Promise<ServerManagementServer | undefined> {
    const doc = await ServerManagementProjectV2Model.findById(projectId).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    if (updates.name !== undefined) {
      server.name = updates.name.trim()
    }
    if (updates.summary !== undefined) {
      server.summary = updates.summary.trim()
    }
    if (updates.host !== undefined) {
      server.host = updates.host.trim()
    }
    if (updates.port !== undefined) {
      server.port = trimValue(updates.port)
    }
    if (updates.user !== undefined) {
      server.user = trimValue(updates.user)
    }
    if (updates.sshKey !== undefined) {
      const { stored: storedSshKey } = prepareSshKeyForStorage(updates.sshKey)
      if (storedSshKey) {
        server.sshKey = storedSshKey
      }
    }
    if (updates.statusCommand !== undefined) {
      server.statusCommand = trimValue(updates.statusCommand)
    }
    if (updates.appDirectory !== undefined) {
      server.appDirectory = trimValue(updates.appDirectory)
    }
    if (updates.services !== undefined) {
      server.services = normalizeServices(updates.services)
    }

    doc.markModified('servers')
    await doc.save()
    return toServerWithoutSshKey(server)
  },

  async deleteServer(projectId: string, serverId: string): Promise<boolean> {
    const doc = await ServerManagementProjectV2Model.findById(projectId).exec()
    if (!doc) return false

    const originalCount = doc.servers.length
    doc.servers = doc.servers.filter((server: ServerManagementServer) => server.id !== serverId)

    if (doc.servers.length === originalCount) {
      return false
    }

    doc.markModified('servers')
    await doc.save()
    return true
  },

  async addAction(
    projectId: string,
    serverId: string,
    input: CreateServerManagementServiceActionInput
  ): Promise<ServerManagementAction | undefined> {
    const doc = await ServerManagementProjectV2Model.findById(projectId).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    const service = findServiceByName(server.services, input.serviceName.trim())
    if (!service) return undefined

    const action = buildAction(input)
    service.actions.push(action)
    doc.markModified('servers')
    await doc.save()

    return action
  },

  async updateAction(
    projectId: string,
    serverId: string,
    actionId: string,
    updates: UpdateServerManagementActionInput
  ): Promise<ServerManagementAction | undefined> {
    const doc = await ServerManagementProjectV2Model.findById(projectId).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    const resolved = findActionInServices(server.services, actionId)
    if (!resolved) return undefined
    const { action } = resolved

    if (updates.name !== undefined) {
      action.name = updates.name.trim()
    }
    if (updates.description !== undefined) {
      action.description = updates.description.trim()
    }
    if (updates.command !== undefined) {
      action.command = updates.command.trim()
    }
    if (updates.risk !== undefined) {
      action.risk = normalizeRisk({ risk: updates.risk })
    } else if (updates.dangerous !== undefined) {
      action.risk = updates.dangerous ? 'dangerous' : 'normal'
    }

    doc.markModified('servers')
    await doc.save()
    return action
  },

  async deleteAction(projectId: string, serverId: string, actionId: string): Promise<boolean> {
    const doc = await ServerManagementProjectV2Model.findById(projectId).exec()
    if (!doc) return false

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return false

    const resolved = findActionInServices(server.services, actionId)
    if (!resolved) return false
    const { service } = resolved

    const originalCount = service.actions.length
    service.actions = service.actions.filter((action: ServerManagementAction) => action.id !== actionId)

    if (service.actions.length === originalCount) {
      return false
    }

    doc.markModified('servers')
    await doc.save()
    return true
  },

  async findServerById(
    serverId: string
  ): Promise<{ project: ServerManagementProjectDocument; server: ServerManagementServer } | undefined> {
    const doc = await ServerManagementProjectV2Model.findOne({ 'servers.id': serverId }).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    return { project: doc, server: toServerWithSshKey(server) }
  },

  async findActionByIds(
    serverId: string,
    actionId: string
  ): Promise<{ project: ServerManagementProjectDocument; server: ServerManagementServer; action: ServerManagementAction } | undefined> {
    const doc = await ServerManagementProjectV2Model.findOne({ 'servers.id': serverId }).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    const resolved = findActionInServices(server.services, actionId)
    if (!resolved) return undefined
    const { action } = resolved

    return { project: doc, server: toServerWithSshKey(server), action }
  },
}
