import { Schema, model, models, type Document } from 'mongoose'

export interface DayEndDocument extends Document {
  userId: string
  endedAt: Date
  createdAt: Date
  updatedAt: Date
}

const dayEndSchema = new Schema<DayEndDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

export const DayEndModel = models.DayEnd ?? model<DayEndDocument>('DayEnd', dayEndSchema)

export type DayEnd = {
  id: string
  userId: string
  endedAt: string
  createdAt: string
  updatedAt: string
}

export function toDayEnd(doc: DayEndDocument): DayEnd {
  return {
    id: doc.id,
    userId: doc.userId,
    endedAt: doc.endedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}



