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
    })

    return toCard(doc)
  },

  async findByBoardId(boardId: string): Promise<Card[]> {
    const docs = await CardModel.find({ boardId }).sort({ createdAt: -1 }).exec()
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
    const doc = await CardModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toCard(doc) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const result = await CardModel.findByIdAndDelete(id).exec()
    return !!result
  },
}

