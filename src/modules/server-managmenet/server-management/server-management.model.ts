import { Schema, model, models, type Document } from 'mongoose'

export type ServerManagementAction = {
  id: string
  name: string
  description: string
  path: string
  dangerous?: boolean
}

export type ServerManagementServer = {
  id: string
  name: string
  summary: string
  host: string
  port?: string
  user?: string
  sshKey?: string
  statusPath?: string
  ecsCluster?: string
  ecsService?: string
  actions: ServerManagementAction[]
}

export interface ServerManagementProjectDocument extends Document {
  name: string
  description: string
  emoji: string
  servers: ServerManagementServer[]
  createdAt: Date
  updatedAt: Date
}

const actionSchema = new Schema<ServerManagementAction>(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    dangerous: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
)

const serverSchema = new Schema<ServerManagementServer>(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    host: {
      type: String,
      required: true,
      trim: true,
    },
    port: {
      type: String,
      trim: true,
    },
    user: {
      type: String,
      trim: true,
    },
    sshKey: {
      type: String,
    },
    statusPath: {
      type: String,
      trim: true,
    },
    ecsCluster: {
      type: String,
      trim: true,
    },
    ecsService: {
      type: String,
      trim: true,
    },
    actions: {
      type: [actionSchema],
      default: [],
    },
  },
  { _id: false }
)

const serverManagementProjectSchema = new Schema<ServerManagementProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
    },
    servers: {
      type: [serverSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

export const ServerManagementProjectModel =
  models.ServerManagementProject ??
  model<ServerManagementProjectDocument>('ServerManagementProject', serverManagementProjectSchema)

export type ServerManagementProject = {
  id: string
  name: string
  description: string
  emoji: string
  servers: ServerManagementServer[]
  createdAt: string
  updatedAt: string
}

export function toServerManagementProject(
  doc: ServerManagementProjectDocument
): ServerManagementProject {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    emoji: doc.emoji,
    servers: (doc.servers || []).map((server) => ({
      id: server.id,
      name: server.name,
      summary: server.summary,
      host: server.host,
      port: server.port,
      user: server.user,
      sshKey: server.sshKey,
      statusPath: server.statusPath,
      ecsCluster: server.ecsCluster,
      ecsService: server.ecsService,
      actions: (server.actions || []).map((action) => ({
        id: action.id,
        name: action.name,
        description: action.description,
        path: action.path,
        dangerous: action.dangerous ?? false,
      })),
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
