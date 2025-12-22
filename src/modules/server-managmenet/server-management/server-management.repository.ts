import { randomUUID } from 'node:crypto'
import {
  ServerManagementProjectModel,
  toServerManagementProject,
  type ServerManagementAction,
  type ServerManagementProject,
  type ServerManagementProjectDocument,
  type ServerManagementServer,
} from './server-management.model'

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
  path: string
  dangerous?: boolean
}

export type CreateServerManagementServerInput = {
  name: string
  summary: string
  host: string
  port?: string
  user?: string
  sshKey?: string
  statusPath?: string
  ecsCluster?: string
  ecsService?: string
  actions?: ServerManagementActionInput[]
}

export type UpdateServerManagementServerInput = Partial<CreateServerManagementServerInput> & {
  actions?: ServerManagementActionInput[]
}

export type UpdateServerManagementActionInput = {
  name?: string
  description?: string
  path?: string
  dangerous?: boolean
}

function trimValue(value?: string) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function buildAction(input: ServerManagementActionInput): ServerManagementAction {
  return {
    id: input.id?.trim() || randomUUID(),
    name: input.name.trim(),
    description: input.description.trim(),
    path: input.path.trim(),
    dangerous: input.dangerous ?? false,
  }
}

function normalizeActions(inputs?: ServerManagementActionInput[]): ServerManagementAction[] {
  if (!inputs) return []
  return inputs.map(buildAction)
}

export const serverManagementRepository = {
  async createProject(input: CreateServerManagementProjectInput): Promise<ServerManagementProject> {
    const doc = await ServerManagementProjectModel.create({
      name: input.name.trim(),
      description: input.description.trim(),
      emoji: input.emoji.trim(),
      servers: [],
    })
    return toServerManagementProject(doc)
  },

  async findAllProjects(): Promise<ServerManagementProject[]> {
    const docs = await ServerManagementProjectModel.find().sort({ name: 1 }).exec()
    return docs.map(toServerManagementProject)
  },

  async findProjectById(id: string): Promise<ServerManagementProject | undefined> {
    const doc = await ServerManagementProjectModel.findById(id).exec()
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

    const doc = await ServerManagementProjectModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toServerManagementProject(doc) : undefined
  },

  async deleteProject(id: string): Promise<boolean> {
    const result = await ServerManagementProjectModel.deleteOne({ _id: id }).exec()
    return result.deletedCount > 0
  },

  async addServer(
    projectId: string,
    input: CreateServerManagementServerInput
  ): Promise<ServerManagementServer | undefined> {
    const doc = await ServerManagementProjectModel.findById(projectId).exec()
    if (!doc) return undefined

    const server: ServerManagementServer = {
      id: randomUUID(),
      name: input.name.trim(),
      summary: input.summary.trim(),
      host: input.host.trim(),
      port: trimValue(input.port),
      user: trimValue(input.user),
      sshKey: input.sshKey ? input.sshKey.trim() : undefined,
      statusPath: trimValue(input.statusPath),
      ecsCluster: trimValue(input.ecsCluster),
      ecsService: trimValue(input.ecsService),
      actions: normalizeActions(input.actions),
    }

    doc.servers.push(server)
    doc.markModified('servers')
    await doc.save()

    return server
  },

  async updateServer(
    projectId: string,
    serverId: string,
    updates: UpdateServerManagementServerInput
  ): Promise<ServerManagementServer | undefined> {
    const doc = await ServerManagementProjectModel.findById(projectId).exec()
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
      server.sshKey = updates.sshKey ? updates.sshKey.trim() : undefined
    }
    if (updates.statusPath !== undefined) {
      server.statusPath = trimValue(updates.statusPath)
    }
    if (updates.ecsCluster !== undefined) {
      server.ecsCluster = trimValue(updates.ecsCluster)
    }
    if (updates.ecsService !== undefined) {
      server.ecsService = trimValue(updates.ecsService)
    }
    if (updates.actions !== undefined) {
      server.actions = normalizeActions(updates.actions)
    }

    doc.markModified('servers')
    await doc.save()
    return server
  },

  async deleteServer(projectId: string, serverId: string): Promise<boolean> {
    const doc = await ServerManagementProjectModel.findById(projectId).exec()
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
    input: ServerManagementActionInput
  ): Promise<ServerManagementAction | undefined> {
    const doc = await ServerManagementProjectModel.findById(projectId).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    const action = buildAction(input)
    server.actions.push(action)
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
    const doc = await ServerManagementProjectModel.findById(projectId).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    const action = server.actions.find((item: ServerManagementAction) => item.id === actionId)
    if (!action) return undefined

    if (updates.name !== undefined) {
      action.name = updates.name.trim()
    }
    if (updates.description !== undefined) {
      action.description = updates.description.trim()
    }
    if (updates.path !== undefined) {
      action.path = updates.path.trim()
    }
    if (updates.dangerous !== undefined) {
      action.dangerous = updates.dangerous
    }

    doc.markModified('servers')
    await doc.save()
    return action
  },

  async deleteAction(projectId: string, serverId: string, actionId: string): Promise<boolean> {
    const doc = await ServerManagementProjectModel.findById(projectId).exec()
    if (!doc) return false

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return false

    const originalCount = server.actions.length
    server.actions = server.actions.filter((action: ServerManagementAction) => action.id !== actionId)

    if (server.actions.length === originalCount) {
      return false
    }

    doc.markModified('servers')
    await doc.save()
    return true
  },

  async findServerById(
    serverId: string
  ): Promise<{ project: ServerManagementProjectDocument; server: ServerManagementServer } | undefined> {
    const doc = await ServerManagementProjectModel.findOne({ 'servers.id': serverId }).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    return { project: doc, server }
  },

  async findActionByIds(
    serverId: string,
    actionId: string
  ): Promise<{ project: ServerManagementProjectDocument; server: ServerManagementServer; action: ServerManagementAction } | undefined> {
    const doc = await ServerManagementProjectModel.findOne({ 'servers.id': serverId }).exec()
    if (!doc) return undefined

    const server = doc.servers.find((item: ServerManagementServer) => item.id === serverId)
    if (!server) return undefined

    const action = server.actions.find((item: ServerManagementAction) => item.id === actionId)
    if (!action) return undefined

    return { project: doc, server, action }
  },
}
