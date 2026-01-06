import { Schema, model, models, type Document } from 'mongoose'

export interface MeetAnalysisDocument extends Document {
  recordingId: string
  transcription: string
  summary: string
  actionItems: string[]
  keyPoints: string[]
  createdAt: Date
  completedAt?: Date
}

const meetAnalysisSchema = new Schema<MeetAnalysisDocument>(
  {
    recordingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transcription: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    actionItems: {
      type: [String],
      default: [],
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

export const MeetAnalysisModel = models.MeetAnalysis ?? model<MeetAnalysisDocument>('MeetAnalysis', meetAnalysisSchema)

export type MeetAnalysis = {
  id: string
  recordingId: string
  transcription: string
  summary: string
  actionItems: string[]
  keyPoints: string[]
  createdAt: string
  completedAt?: string
}

export function toMeetAnalysis(doc: MeetAnalysisDocument): MeetAnalysis {
  return {
    id: doc.id,
    recordingId: doc.recordingId,
    transcription: doc.transcription,
    summary: doc.summary,
    actionItems: doc.actionItems || [],
    keyPoints: doc.keyPoints || [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt as any).toISOString(),
    completedAt: doc.completedAt
      ? (doc.completedAt instanceof Date ? doc.completedAt.toISOString() : new Date(doc.completedAt as any).toISOString())
      : undefined,
  }
}
