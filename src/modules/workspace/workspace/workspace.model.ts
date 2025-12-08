import { Schema, model, models, type Document } from 'mongoose'

export interface WorkspaceMember {
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}

export interface WorkspaceDocument extends Document {
  name: string
  slug: string
  members: WorkspaceMember[]
  createdAt: Date
  updatedAt: Date
}

const workspaceMemberSchema = new Schema<WorkspaceMember>(
  {
    userId: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      required: true,
    },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
)

const workspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    members: {
      type: [workspaceMemberSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

// Index for members.userId as specified in the schema docs
workspaceSchema.index({ 'members.userId': 1 })

export const WorkspaceModel = models.Workspace ?? model<WorkspaceDocument>('Workspace', workspaceSchema)

export type Workspace = {
  id: string
  name: string
  slug: string
  members: Array<{
    userId: string
    role: 'owner' | 'admin' | 'member'
    joinedAt: string
  }>
  createdAt: string
  updatedAt: string
}

export function toWorkspace(doc: WorkspaceDocument): Workspace {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    members: doc.members.map((m) => ({
      userId: m.userId,
      role: m.role as 'owner' | 'admin' | 'member',
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

