import { Schema, model, models, type Document } from 'mongoose'
import type { RichTextDoc } from '../pages/page.model'

export interface TemplateDocument extends Document {
  name: string
  workspaceId?: string // null for global templates
  fieldsStructure: Record<string, any> // JSON structure
  defaultContent: RichTextDoc
  category: 'sop' | 'meeting' | 'project' | 'bug' | 'strategy'
  createdAt: Date
  updatedAt: Date
}

const templateSchema = new Schema<TemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    workspaceId: {
      type: String,
      index: true,
      sparse: true, // Allow null values
    },
    fieldsStructure: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    defaultContent: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    category: {
      type: String,
      enum: ['sop', 'meeting', 'project', 'bug', 'strategy'],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for finding templates by workspace or global
templateSchema.index({ workspaceId: 1, category: 1 })
templateSchema.index({ workspaceId: 1 }) // For null workspaceId (global templates)

export const TemplateModel =
  models.Template ?? model<TemplateDocument>('Template', templateSchema)

export type Template = {
  id: string
  name: string
  workspaceId?: string
  fieldsStructure: Record<string, any>
  defaultContent: RichTextDoc
  category: 'sop' | 'meeting' | 'project' | 'bug' | 'strategy'
  createdAt: string
  updatedAt: string
}

export function toTemplate(doc: TemplateDocument): Template {
  return {
    id: doc.id,
    name: doc.name,
    workspaceId: doc.workspaceId,
    fieldsStructure: doc.fieldsStructure as Record<string, any>,
    defaultContent: doc.defaultContent as RichTextDoc,
    category: doc.category as 'sop' | 'meeting' | 'project' | 'bug' | 'strategy',
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
  }
}
