import { Schema, model, models, type Document } from 'mongoose'

export interface ProjectDocument extends Document {
  name: string
  emoji?: string
  iconUrl?: string
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<ProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    emoji: {
      type: String,
      trim: true,
    },
    iconUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

export const ProjectModel = models.Project ?? model<ProjectDocument>('Project', projectSchema)

export type Project = {
  id: string
  name: string
  emoji?: string
  iconUrl?: string
  createdAt: string
  updatedAt: string
}

export function toProject(doc: ProjectDocument): Project {
  return {
    id: doc.id,
    name: doc.name,
    emoji: doc.emoji,
    iconUrl: doc.iconUrl,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}





