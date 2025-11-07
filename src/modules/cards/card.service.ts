import { boardService } from '../boards/board.service'
import { cardRepository, type CreateCardInput } from './card.repository'

export const cardService = {
  async create(input: CreateCardInput) {
    const board = await boardService.findById(input.boardId)

    if (!board) {
      throw new Error('Board not found')
    }

    if (!board.columns.includes(input.columnId)) {
      throw new Error('Invalid column for this board')
    }

    return cardRepository.create(input)
  },

  async findByBoardId(boardId: string) {
    return cardRepository.findByBoardId(boardId)
  },

  async findById(id: string) {
    return cardRepository.findById(id)
  },

  async moveCard(cardId: string, columnId: string, boardId: string) {
    const board = await boardService.findById(boardId)

    if (!board) {
      throw new Error('Board not found')
    }

    if (!board.columns.includes(columnId)) {
      throw new Error('Invalid column for this board')
    }

    return cardRepository.update(cardId, { columnId })
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
  }) {
    if (updates.columnId) {
      const card = await cardRepository.findById(cardId)
      if (!card) {
        throw new Error('Card not found')
      }
      const board = await boardService.findById(card.boardId)
      if (!board) {
        throw new Error('Board not found')
      }
      if (!board.columns.includes(updates.columnId)) {
        throw new Error('Invalid column for this board')
      }
    }
    return cardRepository.update(cardId, updates)
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
}

