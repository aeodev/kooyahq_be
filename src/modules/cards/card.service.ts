import { boardService } from '../boards/board.service'
import { cardRepository, type CreateCardInput } from './card.repository'
import { cardActivityRepository } from './card-activity.repository'

export const cardService = {
  async create(input: CreateCardInput, userId: string) {
    const board = await boardService.findById(input.boardId)

    if (!board) {
      throw new Error('Board not found')
    }

    if (!board.columns.includes(input.columnId)) {
      throw new Error('Invalid column for this board')
    }

    const card = await cardRepository.create(input)

    // Log creation
    await cardActivityRepository.create({
      cardId: card.id,
      boardId: card.boardId,
      userId,
      action: 'created',
      metadata: { columnId: card.columnId, issueType: card.issueType },
    })

    return card
  },

  async findByBoardId(boardId: string) {
    return cardRepository.findByBoardId(boardId)
  },

  async findById(id: string) {
    return cardRepository.findById(id)
  },

  async moveCard(cardId: string, columnId: string, boardId: string, userId: string) {
    const board = await boardService.findById(boardId)

    if (!board) {
      throw new Error('Board not found')
    }

    if (!board.columns.includes(columnId)) {
      throw new Error('Invalid column for this board')
    }

    const card = await cardRepository.findById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }
    const oldColumn = card.columnId

    const updated = await cardRepository.update(cardId, { columnId })

    // Log movement
    await cardActivityRepository.create({
      cardId,
      boardId,
      userId,
      action: 'moved',
      field: 'columnId',
      oldValue: oldColumn,
      newValue: columnId,
    })

    return updated
  },

  async updateCard(cardId: string, updates: {
    title?: string
    description?: string
    columnId?: string
    issueType?: 'task' | 'bug' | 'story' | 'epic'
    assigneeId?: string
    priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
    labels?: string[]
    dueDate?: Date | null
    storyPoints?: number | null
    completed?: boolean
    epicId?: string | null
    rank?: number | null
    flagged?: boolean
  }, userId: string) {
    const card = await cardRepository.findById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }

    if (updates.columnId) {
      const board = await boardService.findById(card.boardId)
      if (!board) {
        throw new Error('Board not found')
      }
      if (!board.columns.includes(updates.columnId)) {
        throw new Error('Invalid column for this board')
      }
    }

    // Track field changes
    const activities = []
    if (updates.title !== undefined && updates.title !== card.title) {
      activities.push({
        cardId,
        boardId: card.boardId,
        userId,
        action: 'updated' as const,
        field: 'title',
        oldValue: card.title,
        newValue: updates.title,
      })
    }
    if (updates.assigneeId !== undefined && updates.assigneeId !== card.assigneeId) {
      activities.push({
        cardId,
        boardId: card.boardId,
        userId,
        action: updates.assigneeId ? ('assigned' as const) : ('updated' as const),
        field: 'assigneeId',
        oldValue: card.assigneeId || undefined,
        newValue: updates.assigneeId || undefined,
      })
    }
    if (updates.priority !== undefined && updates.priority !== card.priority) {
      activities.push({
        cardId,
        boardId: card.boardId,
        userId,
        action: 'updated' as const,
        field: 'priority',
        oldValue: card.priority,
        newValue: updates.priority,
      })
    }
    if (updates.completed !== undefined && updates.completed !== card.completed) {
      activities.push({
        cardId,
        boardId: card.boardId,
        userId,
        action: 'completed' as const,
        field: 'completed',
        oldValue: String(card.completed),
        newValue: String(updates.completed),
      })
    }
    if (updates.columnId !== undefined && updates.columnId !== card.columnId) {
      activities.push({
        cardId,
        boardId: card.boardId,
        userId,
        action: 'moved' as const,
        field: 'columnId',
        oldValue: card.columnId,
        newValue: updates.columnId,
      })
    }

    const updated = await cardRepository.update(cardId, updates)

    // Log all activities
    await Promise.all(activities.map(act => cardActivityRepository.create(act)))

    return updated
  },

  async deleteCard(cardId: string) {
    const card = await cardRepository.findById(cardId)
    if (!card) {
      return false
    }
    return cardRepository.delete(cardId)
  },

  async addAttachment(cardId: string, attachment: any) {
    const card = await cardRepository.findById(cardId)
    if (!card) {
      return null
    }
    const attachments = [...(card.attachments || []), attachment]
    return cardRepository.update(cardId, { attachments })
  },

  async removeAttachment(cardId: string, attachmentId: string) {
    const card = await cardRepository.findById(cardId)
    if (!card) {
      return null
    }
    const attachments = (card.attachments || []).filter(
      (att: any) => att._id?.toString() !== attachmentId && att.filename !== attachmentId
    )
    return cardRepository.update(cardId, { attachments })
  },

  async bulkUpdateRanks(boardId: string, rankUpdates: Array<{ id: string; rank: number }>) {
    const board = await boardService.findById(boardId)
    if (!board) {
      throw new Error('Board not found')
    }
    return cardRepository.bulkUpdateRanks(boardId, rankUpdates)
  },
}

