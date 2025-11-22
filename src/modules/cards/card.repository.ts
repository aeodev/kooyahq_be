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
  coverImage?: { url?: string; color?: string; brightness?: 'dark' | 'light' } | null
  completed?: boolean
  epicId?: string | null
  sprintId?: string | null
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
    const updateData: any = {}
    const unsetFields: any = {}
    
    // Handle regular fields
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.columnId !== undefined) updateData.columnId = updates.columnId
    if (updates.issueType !== undefined) updateData.issueType = updates.issueType
    if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.labels !== undefined) updateData.labels = updates.labels
    if (updates.attachments !== undefined) updateData.attachments = updates.attachments
    if (updates.completed !== undefined) updateData.completed = updates.completed
    if (updates.flagged !== undefined) updateData.flagged = updates.flagged
    
    // Handle nullable fields
    if (updates.dueDate === null) {
      unsetFields.dueDate = ''
    } else if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate
    }
    
    if (updates.storyPoints === null) {
      unsetFields.storyPoints = ''
    } else if (updates.storyPoints !== undefined) {
      updateData.storyPoints = updates.storyPoints
    }
    
    if (updates.epicId === null) {
      unsetFields.epicId = ''
    } else if (updates.epicId !== undefined) {
      updateData.epicId = updates.epicId
    }
    
    if (updates.sprintId === null) {
      unsetFields.sprintId = ''
    } else if (updates.sprintId !== undefined) {
      updateData.sprintId = updates.sprintId
    }
    
    if (updates.rank === null) {
      unsetFields.rank = ''
    } else if (updates.rank !== undefined) {
      updateData.rank = updates.rank
    }
    
    // Handle coverImage - must be separate to avoid conflict
    if (updates.coverImage === null) {
      unsetFields.coverImage = ''
    } else if (updates.coverImage !== undefined) {
      updateData.coverImage = updates.coverImage
    }
    
    // Build final update object
    const finalUpdate: any = {}
    if (Object.keys(updateData).length > 0) {
      finalUpdate.$set = updateData
    }
    if (Object.keys(unsetFields).length > 0) {
      finalUpdate.$unset = unsetFields
    }
    
    const doc = await CardModel.findByIdAndUpdate(id, finalUpdate, { new: true }).exec()
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

  // Checklist methods
  async addChecklist(cardId: string, checklist: { id: string; title: string; items?: any[] }): Promise<Card | undefined> {
    const doc = await CardModel.findByIdAndUpdate(
      cardId,
      { $push: { checklists: checklist } },
      { new: true }
    ).exec()
    return doc ? toCard(doc) : undefined
  },

  async updateChecklist(cardId: string, checklistId: string, updates: { title?: string }): Promise<Card | undefined> {
    const updateData: any = {}
    if (updates.title !== undefined) {
      updateData['checklists.$[checklist].title'] = updates.title
    }
    const doc = await CardModel.findOneAndUpdate(
      { _id: cardId },
      { $set: updateData },
      {
        arrayFilters: [{ 'checklist.id': checklistId }],
        new: true,
      }
    ).exec()
    return doc ? toCard(doc) : undefined
  },

  async deleteChecklist(cardId: string, checklistId: string): Promise<Card | undefined> {
    const doc = await CardModel.findByIdAndUpdate(
      cardId,
      { $pull: { checklists: { id: checklistId } } },
      { new: true }
    ).exec()
    return doc ? toCard(doc) : undefined
  },

  async addChecklistItem(cardId: string, checklistId: string, item: { id: string; text: string; completed?: boolean; order?: number }): Promise<Card | undefined> {
    const doc = await CardModel.findOneAndUpdate(
      { _id: cardId, 'checklists.id': checklistId },
      { $push: { 'checklists.$.items': item } },
      { new: true }
    ).exec()
    return doc ? toCard(doc) : undefined
  },

  async updateChecklistItem(cardId: string, checklistId: string, itemId: string, updates: { text?: string; completed?: boolean; order?: number }): Promise<Card | undefined> {
    const updateData: any = {}
    if (updates.text !== undefined) {
      updateData['checklists.$[checklist].items.$[item].text'] = updates.text
    }
    if (updates.completed !== undefined) {
      updateData['checklists.$[checklist].items.$[item].completed'] = updates.completed
    }
    if (updates.order !== undefined) {
      updateData['checklists.$[checklist].items.$[item].order'] = updates.order
    }
    const doc = await CardModel.findOneAndUpdate(
      { _id: cardId, 'checklists.id': checklistId, 'checklists.items.id': itemId },
      { $set: updateData },
      {
        arrayFilters: [{ 'checklist.id': checklistId }, { 'item.id': itemId }],
        new: true,
      }
    ).exec()
    return doc ? toCard(doc) : undefined
  },

  async deleteChecklistItem(cardId: string, checklistId: string, itemId: string): Promise<Card | undefined> {
    const doc = await CardModel.findOneAndUpdate(
      { _id: cardId, 'checklists.id': checklistId },
      { $pull: { 'checklists.$.items': { id: itemId } } },
      { new: true }
    ).exec()
    return doc ? toCard(doc) : undefined
  },
}

