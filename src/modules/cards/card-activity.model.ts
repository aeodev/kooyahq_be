import { Schema, model, models, type Document } from 'mongoose'

export interface CardActivityDocument extends Document {
  cardId: string
  boardId: string
  userId: string
  action: 'created' | 'updated' | 'moved' | 'assigned' | 'completed' | 'deleted' | 'commented'
  field?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, any>
  createdAt: Date
}

const cardActivitySchema = new Schema<CardActivityDocument>(
  {
    cardId: { type: String, required: true, index: true },
    boardId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    action: {
      type: String,
      enum: ['created', 'updated', 'moved', 'assigned', 'completed', 'deleted', 'commented'],
      required: true,
    },
    field: String,
    oldValue: String,
    newValue: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
)

export const CardActivityModel = models.CardActivity ?? model<CardActivityDocument>('CardActivity', cardActivitySchema)

