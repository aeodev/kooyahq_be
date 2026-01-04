import { Schema, model, models, type Document } from 'mongoose'

export type ActionRisk = 'normal' | 'warning' | 'dangerous'

export type ServerManagementAction = {
  id: string
  name: string
  description: string
  command: string
  risk: ActionRisk
}

export type ServerManagementService = {
  name: string
  serviceName: string
  actions: ServerManagementAction[]
}

export type ServerManagementServer = {
  id: string
  name: string
  summary: string
  host: string
  port?: string
  user?: string
  sshKey?: string
  statusCommand?: string
  appDirectory?: string
  services: ServerManagementService[]
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
    command: {
      type: String,
      required: true,
      trim: true,
    },
    risk: {
      type: String,
      enum: ['normal', 'warning', 'dangerous'],
      default: 'normal',
    },
  },
  { _id: false }
)

const serviceSchema = new Schema<ServerManagementService>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    serviceName: {
      type: String,
      trim: true,
      default: '',
    },
    actions: {
      type: [actionSchema],
      default: [],
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
    statusCommand: {
      type: String,
      trim: true,
    },
    appDirectory: {
      type: String,
      trim: true,
    },
    services: {
      type: [serviceSchema],
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

export const ServerManagementProjectV2Model =
  models.ServerManagementProjectV2 ??
  model<ServerManagementProjectDocument>('ServerManagementProjectV2', serverManagementProjectSchema)

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
      statusCommand: server.statusCommand,
      appDirectory: server.appDirectory,
      services: (server.services || []).map((service) => ({
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
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
