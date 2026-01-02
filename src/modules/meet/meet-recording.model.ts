import { Schema, model, models, type Document } from 'mongoose'
import { resolveMediaUrl } from '../../utils/media-url'

export interface MeetRecordingDocument extends Document {
  meetId: string
  userId: string
  recordingUrl: string
  duration: number // seconds
  startTime: Date
  endTime: Date
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  analysisId?: string
  createdAt: Date
  updatedAt: Date
}

const meetRecordingSchema = new Schema<MeetRecordingDocument>(
  {
    meetId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    recordingUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    analysisId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

meetRecordingSchema.index({ userId: 1, createdAt: -1 })
meetRecordingSchema.index({ meetId: 1 })
meetRecordingSchema.index({ analysisStatus: 1 })

export const MeetRecordingModel = models.MeetRecording ?? model<MeetRecordingDocument>('MeetRecording', meetRecordingSchema)

export type MeetRecording = {
  id: string
  meetId: string
  userId: string
  recordingUrl: string
  duration: number
  startTime: string
  endTime: string
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  analysisId?: string
  createdAt: string
  updatedAt: string
}

export function toMeetRecording(doc: MeetRecordingDocument): MeetRecording {
  return {
    id: doc.id,
    meetId: doc.meetId,
    userId: doc.userId,
    recordingUrl: resolveMediaUrl(doc.recordingUrl) || doc.recordingUrl,
    duration: doc.duration,
    startTime: doc.startTime instanceof Date ? doc.startTime.toISOString() : new Date(doc.startTime as any).toISOString(),
    endTime: doc.endTime instanceof Date ? doc.endTime.toISOString() : new Date(doc.endTime as any).toISOString(),
    analysisStatus: doc.analysisStatus,
    analysisId: doc.analysisId,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt as any).toISOString(),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt as any).toISOString(),
  }
}
