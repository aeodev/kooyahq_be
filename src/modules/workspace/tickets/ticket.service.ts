import { boardService } from '../boards/board.service'
import { ticketRepository, type CreateTicketInput } from './ticket.repository'

function generateRank(): string {
  return `rank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const ticketService = {
  async create(input: CreateTicketInput, userId: string) {
    const board = await boardService.findById(input.boardId)

    if (!board) {
      throw new Error('Board not found')
    }

    // Validate column exists
    const column = board.columns.find((col) => col.id === input.columnId)
    if (!column) {
      throw new Error('Invalid column for this board')
    }

    // Auto-set completedAt if moved to done column
    const completedAt = column.isDoneColumn ? new Date() : undefined

    const ticket = await ticketRepository.create({
      ...input,
      rank: input.rank || generateRank(),
    })

    // Update completedAt if needed
    if (completedAt) {
      await ticketRepository.update(ticket.id, { completedAt })
    }

    return ticket
  },

  async findByBoardId(boardId: string) {
    return ticketRepository.findByBoardId(boardId)
  },

  async findById(id: string) {
    return ticketRepository.findById(id)
  },

  async findByTicketKey(ticketKey: string) {
    return ticketRepository.findByTicketKey(ticketKey)
  },

  async findByParentTicketId(parentTicketId: string) {
    return ticketRepository.findByParentTicketId(parentTicketId)
  },

  async findByRootEpicId(rootEpicId: string) {
    return ticketRepository.findByRootEpicId(rootEpicId)
  },

  async moveTicket(
    ticketId: string,
    columnId: string,
    boardId: string,
    userId: string,
  ) {
    const board = await boardService.findById(boardId)

    if (!board) {
      throw new Error('Board not found')
    }

    const column = board.columns.find((col) => col.id === columnId)
    if (!column) {
      throw new Error('Invalid column for this board')
    }

    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const updates: any = { columnId }

    // Auto-set completedAt when moved to done column
    if (column.isDoneColumn && !ticket.completedAt) {
      updates.completedAt = new Date()
    } else if (!column.isDoneColumn && ticket.completedAt) {
      // Clear completedAt if moved away from done column
      updates.completedAt = null
    }

    const updated = await ticketRepository.update(ticketId, updates)

    return updated
  },

  async updateTicket(
    ticketId: string,
    updates: {
      title?: string
      description?: Record<string, any>
      parentTicketId?: string
      rootEpicId?: string
      columnId?: string
      rank?: string
      points?: number | null
      priority?: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
      tags?: string[]
      assigneeId?: string | null
      acceptanceCriteria?: Array<{
        id: string
        text: string
        isCompleted: boolean
      }>
      documents?: Array<{
        name: string
        url: string
        type: 'doc' | 'sheet' | 'slide' | 'figma' | 'other'
      }>
      attachments?: Array<{
        id: string
        url: string
        name: string
        type: string
        uploadedAt: Date
      }>
      startDate?: Date | null
      endDate?: Date | null
      dueDate?: Date | null
      github?: {
        branchName?: string
        pullRequestUrl?: string
        status?: 'open' | 'merged' | 'closed'
      }
    },
    userId: string,
  ) {
    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // If columnId is being updated, check if it's a done column
    if (updates.columnId) {
      const board = await boardService.findById(ticket.boardId)
      if (!board) {
        throw new Error('Board not found')
      }

      const column = board.columns.find((col) => col.id === updates.columnId)
      if (!column) {
        throw new Error('Invalid column for this board')
      }

      // Auto-set completedAt when moved to done column
      if (column.isDoneColumn && !ticket.completedAt) {
        updates.completedAt = new Date()
      } else if (!column.isDoneColumn && ticket.completedAt) {
        // Clear completedAt if moved away from done column
        updates.completedAt = null
      }
    }

    const updated = await ticketRepository.update(ticketId, updates)

    return updated
  },

  async deleteTicket(ticketId: string) {
    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      return false
    }
    return ticketRepository.softDelete(ticketId)
  },

  async addAttachment(ticketId: string, attachment: {
    id: string
    url: string
    name: string
    type: string
    uploadedAt: Date
  }) {
    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      return null
    }
    const attachments = [...(ticket.attachments || []), attachment]
    return ticketRepository.update(ticketId, { attachments })
  },

  async removeAttachment(ticketId: string, attachmentId: string) {
    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      return null
    }
    const attachments = (ticket.attachments || []).filter(
      (att) => att.id !== attachmentId,
    )
    return ticketRepository.update(ticketId, { attachments })
  },

  async bulkUpdateRanks(
    boardId: string,
    rankUpdates: Array<{ id: string; rank: string }>,
  ) {
    const board = await boardService.findById(boardId)
    if (!board) {
      throw new Error('Board not found')
    }
    return ticketRepository.bulkUpdateRanks(boardId, rankUpdates)
  },

  async trackView(ticketId: string, userId: string) {
    return ticketRepository.addViewer(ticketId, userId)
  },
}

