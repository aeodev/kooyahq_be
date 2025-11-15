import { CardActivityModel, type CardActivityDocument } from './card-activity.model'

export type CreateActivityInput = {
  cardId: string
  boardId: string
  userId: string
  action: 'created' | 'updated' | 'moved' | 'assigned' | 'completed' | 'deleted' | 'commented'
  field?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, any>
}

export type CardActivity = {
  id: string
  cardId: string
  boardId: string
  userId: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  metadata?: Record<string, any>
  createdAt: string
}

function toActivity(doc: CardActivityDocument): CardActivity {
  return {
    id: doc.id,
    cardId: doc.cardId,
    boardId: doc.boardId,
    userId: doc.userId,
    action: doc.action,
    field: doc.field,
    oldValue: doc.oldValue,
    newValue: doc.newValue,
    metadata: doc.metadata,
    createdAt: doc.createdAt.toISOString(),
  }
}

export const cardActivityRepository = {
  async create(input: CreateActivityInput): Promise<CardActivity> {
    const doc = await CardActivityModel.create(input)
    return toActivity(doc)
  },

  async findByCardId(cardId: string): Promise<CardActivity[]> {
    const docs = await CardActivityModel.find({ cardId })
      .sort({ createdAt: -1 })
      .limit(100)
    return docs.map(toActivity)
  },
}

