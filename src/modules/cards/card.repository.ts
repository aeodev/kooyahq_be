import { CardModel, toCard, type Card } from './card.model'

export type CreateCardInput = {
  title: string
  description?: string
  boardId: string
  columnId: string
  issueType?: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels?: string[]
  dueDate?: Date
  storyPoints?: number
  epicId?: string
  rank?: number
  flagged?: boolean
}

export type UpdateCardInput = {
  title?: string
  description?: string
  columnId?: string
  issueType?: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels?: string[]
  dueDate?: Date | null
  storyPoints?: number | null
  attachments?: any[]
  completed?: boolean
  epicId?: string | null
  rank?: number | null
  flagged?: boolean
}

export const cardRepository = {
  async create(input: CreateCardInput): Promise<Card> {
    const doc = await CardModel.create({
      title: input.title,
      description: input.description,
      boardId: input.boardId,
      columnId: input.columnId,
      issueType: input.issueType || 'task',
      assigneeId: input.assigneeId,
      priority: input.priority || 'medium',
      labels: input.labels || [],
      dueDate: input.dueDate,
      storyPoints: input.storyPoints,
      epicId: input.epicId,
      rank: input.rank,
      flagged: input.flagged ?? false,
    })

    return toCard(doc)
  },

  async findByBoardId(boardId: string, sortByRank?: boolean): Promise<Card[]> {
    const sort: Record<string, 1 | -1> = sortByRank 
      ? { rank: 1, createdAt: -1 } // Sort by rank first (ascending), then by creation date
      : { createdAt: -1 }
    const docs = await CardModel.find({ boardId }).sort(sort).exec()
    return docs.map((doc) => toCard(doc))
  },

  async findById(id: string): Promise<Card | undefined> {
    const doc = await CardModel.findById(id).exec()
    return doc ? toCard(doc) : undefined
  },

  async update(id: string, updates: UpdateCardInput): Promise<Card | undefined> {
    const updateData: any = { ...updates }
    if (updates.dueDate === null) {
      updateData.$unset = { dueDate: '' }
    }
    if (updates.storyPoints === null) {
      updateData.$unset = { ...updateData.$unset, storyPoints: '' }
    }
    if (updates.epicId === null) {
      updateData.$unset = { ...updateData.$unset, epicId: '' }
    }
    if (updates.rank === null) {
      updateData.$unset = { ...updateData.$unset, rank: '' }
    }
    const doc = await CardModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toCard(doc) : undefined
  },

  async bulkUpdateRanks(boardId: string, rankUpdates: Array<{ id: string; rank: number }>): Promise<Card[]> {
    const bulkOps = rankUpdates.map(({ id, rank }) => ({
      updateOne: {
        filter: { _id: id, boardId },
        update: { $set: { rank } },
      },
    }))

    if (bulkOps.length > 0) {
      await CardModel.bulkWrite(bulkOps)
    }

    // Return updated cards
    const updatedIds = rankUpdates.map((u) => u.id)
    const docs = await CardModel.find({ _id: { $in: updatedIds }, boardId }).exec()
    return docs.map((doc) => toCard(doc))
  },

  async delete(id: string): Promise<boolean> {
    const result = await CardModel.findByIdAndDelete(id).exec()
    return !!result
  },
}

