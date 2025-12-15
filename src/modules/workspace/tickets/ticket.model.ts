import { Schema, model, models, type Document } from 'mongoose'

export type RichTextDoc = Record<string, any>

export interface Attachment {
  id: string
  url: string
  name: string
  type: string
  uploadedAt: Date
}

export interface DocumentLink {
  name: string
  url: string
  type: 'doc' | 'sheet' | 'slide' | 'figma' | 'other'
}

export type TicketGithubStatus =
  | 'open'
  | 'merged'
  | 'closed'
  | 'requested_pr'
  | 'merging_pr'
  | 'merged_pr'
  | 'deploying'
  | 'deployed'
  | 'failed'

export interface ChecklistItem {
  id: string
  text: string
  isCompleted: boolean
}

export interface TicketGithub {
  branchName?: string
  pullRequestUrl?: string
  status?: TicketGithubStatus
}

export interface TicketViewer {
  userId: string
  viewedAt: Date
  viewedAgainAt?: Date
}

export interface TicketDocument extends Document {
  boardId: string
  ticketKey: string
  ticketType: 'epic' | 'story' | 'task' | 'bug' | 'subtask'
  title: string
  description: RichTextDoc
  parentTicketId?: string
  rootEpicId?: string
  columnId: string
  rank: string
  points?: number
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  tags: string[]
  assigneeId?: string
  reporterId: string
  acceptanceCriteria: ChecklistItem[]
  documents: DocumentLink[]
  attachments: Attachment[]
  startDate?: Date
  endDate?: Date
  dueDate?: Date
  completedAt?: Date
  deletedAt?: Date
  github?: TicketGithub
  viewedBy: TicketViewer[]
  relatedTickets: string[]
  createdAt: Date
  updatedAt: Date
}

const attachmentSchema = new Schema<Attachment>(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
)

const documentLinkSchema = new Schema<DocumentLink>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['doc', 'sheet', 'slide', 'figma', 'other'],
      required: true,
    },
  },
  { _id: false },
)

const checklistItemSchema = new Schema<ChecklistItem>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, required: true, default: false },
  },
  { _id: false },
)

const ticketGithubSchema = new Schema<TicketGithub>(
  {
    branchName: { type: String },
    pullRequestUrl: { type: String },
    status: {
      type: String,
      enum: ['open', 'merged', 'closed', 'requested_pr', 'merging_pr', 'merged_pr', 'deploying', 'deployed', 'failed'],
    },
  },
  { _id: false },
)

const ticketViewerSchema = new Schema<TicketViewer>(
  {
    userId: { type: String, required: true },
    viewedAt: { type: Date, required: true, default: Date.now },
    viewedAgainAt: { type: Date, required: false },
  },
  { _id: false },
)

const ticketSchema = new Schema<TicketDocument>(
  {
    boardId: {
      type: String,
      required: true,
      index: true,
    },
    ticketKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ticketType: {
      type: String,
      enum: ['epic', 'story', 'task', 'bug', 'subtask'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    parentTicketId: {
      type: String,
      index: true,
    },
    rootEpicId: {
      type: String,
    },
    columnId: {
      type: String,
      required: true,
    },
    rank: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      min: 0,
    },
    priority: {
      type: String,
      enum: ['highest', 'high', 'medium', 'low', 'lowest'],
      required: true,
      default: 'medium',
    },
    tags: {
      type: [String],
      default: [],
    },
    assigneeId: {
      type: String,
      index: true,
    },
    reporterId: {
      type: String,
      required: true,
    },
    acceptanceCriteria: {
      type: [checklistItemSchema],
      default: [],
    },
    documents: {
      type: [documentLinkSchema],
      default: [],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    github: {
      type: ticketGithubSchema,
    },
    viewedBy: {
      type: [ticketViewerSchema],
      default: [],
    },
    relatedTickets: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

export const TicketModel = models.Ticket ?? model<TicketDocument>('Ticket', ticketSchema)

export type Ticket = {
  id: string
  boardId: string
  ticketKey: string
  ticketType: 'epic' | 'story' | 'task' | 'bug' | 'subtask'
  title: string
  description: RichTextDoc
  parentTicketId?: string
  rootEpicId?: string
  columnId: string
  rank: string
  points?: number
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  tags: string[]
  assigneeId?: string
  reporterId: string
  acceptanceCriteria: Array<{
    id: string
    text: string
    isCompleted: boolean
  }>
  documents: Array<{
    name: string
    url: string
    type: 'doc' | 'sheet' | 'slide' | 'figma' | 'other'
  }>
  attachments: Array<{
    id: string
    url: string
    name: string
    type: string
    uploadedAt: string
  }>
  startDate?: string
  endDate?: string
  dueDate?: string
  completedAt?: string
  deletedAt?: string
  github?: {
    branchName?: string
    pullRequestUrl?: string
    status?: TicketGithubStatus
  }
  viewedBy: Array<{
    userId: string
    viewedAt: string
    viewedAgainAt?: string
  }>
  relatedTickets: string[]
  createdAt: string
  updatedAt: string
}

export function toTicket(doc: TicketDocument): Ticket {
  return {
    id: doc.id,
    boardId: doc.boardId,
    ticketKey: doc.ticketKey,
    ticketType: doc.ticketType as 'epic' | 'story' | 'task' | 'bug' | 'subtask',
    title: doc.title,
    description: doc.description as RichTextDoc,
    parentTicketId: doc.parentTicketId,
    rootEpicId: doc.rootEpicId,
    columnId: doc.columnId,
    rank: doc.rank,
    points: doc.points,
    priority: doc.priority as 'highest' | 'high' | 'medium' | 'low' | 'lowest',
    tags: doc.tags || [],
    assigneeId: doc.assigneeId,
    reporterId: doc.reporterId,
    acceptanceCriteria: doc.acceptanceCriteria.map((item) => ({
      id: item.id,
      text: item.text,
      isCompleted: item.isCompleted,
    })),
    documents: doc.documents.map((doc) => ({
      name: doc.name,
      url: doc.url,
      type: doc.type as 'doc' | 'sheet' | 'slide' | 'figma' | 'other',
    })),
    attachments: doc.attachments.map((att) => ({
      id: att.id,
      url: att.url,
      name: att.name,
      type: att.type,
      uploadedAt: att.uploadedAt.toISOString(),
    })),
    startDate: doc.startDate?.toISOString(),
    endDate: doc.endDate?.toISOString(),
    dueDate: doc.dueDate?.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    deletedAt: doc.deletedAt?.toISOString(),
    github: doc.github
      ? {
          branchName: doc.github.branchName,
          pullRequestUrl: doc.github.pullRequestUrl,
          status: doc.github.status as TicketGithubStatus | undefined,
        }
      : undefined,
    viewedBy: (doc.viewedBy || []).map((viewer) => ({
      userId: viewer.userId,
      viewedAt: viewer.viewedAt.toISOString(),
      viewedAgainAt: viewer.viewedAgainAt?.toISOString(),
    })),
    relatedTickets: doc.relatedTickets || [],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

