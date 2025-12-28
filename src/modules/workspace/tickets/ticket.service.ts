import { boardService } from '../boards/board.service'
import { ticketRepository, type CreateTicketInput } from './ticket.repository'
import type { TicketGithubStatus } from './ticket.model'

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

    // Validation: Subtasks must have parentTicketId
    if (input.ticketType === 'subtask') {
      if (!input.parentTicketId) {
        throw new Error('Subtasks must have a parent ticket')
      }
      const parent = await ticketRepository.findById(input.parentTicketId)
      if (!parent) {
        throw new Error('Parent ticket not found')
      }
      if (parent.ticketType === 'subtask') {
        throw new Error('Subtasks cannot have subtasks as parents')
      }
    }

    // Validation: Epics cannot have parentTicketId or rootEpicId
    if (input.ticketType === 'epic') {
      if (input.parentTicketId) {
        throw new Error('Epics cannot have a parent ticket')
      }
      if (input.rootEpicId) {
        throw new Error('Epics cannot have a root epic')
      }
    }

    // Validation: Non-epics with rootEpicId must point to an epic
    if (input.ticketType !== 'epic' && input.rootEpicId) {
      const epic = await ticketRepository.findById(input.rootEpicId)
      if (!epic) {
        throw new Error('Root epic not found')
      }
      if (epic.ticketType !== 'epic') {
        throw new Error('Root epic must be of type epic')
      }
    }

    // Validation: parentTicketId rules
    // - For task/bug/story: parentTicketId can be epic OR bug
    // - For subtask: parentTicketId can be task/bug/story/epic
    if (input.parentTicketId) {
      const parent = await ticketRepository.findById(input.parentTicketId)
      if (!parent) {
        throw new Error('Parent ticket not found')
      }
      
      if (input.ticketType === 'task' || input.ticketType === 'bug' || input.ticketType === 'story') {
        // Task/Bug/Story: parent can be epic OR bug
        if (parent.ticketType !== 'epic' && parent.ticketType !== 'bug') {
          throw new Error('Task, bug, and story tickets must have an epic or bug as parent')
        }
      } else if (input.ticketType === 'subtask') {
        // Subtask: parent cannot be a subtask
        if (parent.ticketType === 'subtask') {
          throw new Error('Subtasks cannot have subtasks as parents')
        }
      } else if (input.ticketType === 'epic') {
        // Epics cannot have parentTicketId
        throw new Error('Epics cannot have a parent ticket')
      }
    }

    // Validation: Related tickets
    if (input.relatedTickets && input.relatedTickets.length > 0) {
      // Check all related tickets exist
      for (const relatedId of input.relatedTickets) {
        const relatedTicket = await ticketRepository.findById(relatedId)
        if (!relatedTicket) {
          throw new Error(`Related ticket ${relatedId} not found`)
        }
        // Cannot relate to epics or subtasks
        if (relatedTicket.ticketType === 'epic' || relatedTicket.ticketType === 'subtask') {
          throw new Error('Cannot relate to epics or subtasks')
        }
        // Cannot relate to self (will be set after creation, but validate input)
        if (relatedId === input.parentTicketId) {
          throw new Error('Cannot relate ticket to itself')
        }
      }
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

  async findArchivedByBoardId(boardId: string) {
    return ticketRepository.findArchivedByBoardId(boardId)
  },

  async findById(id: string) {
    return ticketRepository.findById(id)
  },

  async findByTicketKey(ticketKey: string) {
    return ticketRepository.findByTicketKey(ticketKey)
  },

  async findByGithubBranchName(branchName: string) {
    return ticketRepository.findByGithubBranchName(branchName)
  },

  async findByParentTicketId(parentTicketId: string) {
    return ticketRepository.findByParentTicketId(parentTicketId)
  },

  async findByRootEpicId(rootEpicId: string) {
    return ticketRepository.findByRootEpicId(rootEpicId)
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
      relatedTickets?: string[]
      completedAt?: Date | null
      archivedAt?: Date | null
      archivedBy?: string | null
      github?: {
        branchName?: string
        pullRequestUrl?: string
        status?: TicketGithubStatus
      }
    },
    userId: string,
  ) {
    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    // Validation: Epics cannot have parentTicketId or rootEpicId
    if (ticket.ticketType === 'epic') {
      if (updates.parentTicketId !== undefined) {
        throw new Error('Epics cannot have a parent ticket')
      }
      if (updates.rootEpicId !== undefined) {
        throw new Error('Epics cannot have a root epic')
      }
    }

    // Validation: parentTicketId rules
    // - For task/bug/story: parentTicketId can be epic OR bug
    // - For subtask: parentTicketId can be task/bug/story/epic (required for subtasks)
    if (updates.parentTicketId !== undefined) {
      if (updates.parentTicketId) {
        const parent = await ticketRepository.findById(updates.parentTicketId)
        if (!parent) {
          throw new Error('Parent ticket not found')
        }
        
        if (ticket.ticketType === 'task' || ticket.ticketType === 'bug' || ticket.ticketType === 'story') {
          // Task/Bug/Story: parent can be epic OR bug
          if (parent.ticketType !== 'epic' && parent.ticketType !== 'bug') {
            throw new Error('Task, bug, and story tickets must have an epic or bug as parent')
          }
        } else if (ticket.ticketType === 'subtask') {
          // Subtask: parent cannot be a subtask
          if (parent.ticketType === 'subtask') {
            throw new Error('Subtasks cannot have subtasks as parents')
          }
        } else if (ticket.ticketType === 'epic') {
          // Epics cannot have parentTicketId
          throw new Error('Epics cannot have a parent ticket')
        }
      } else {
        // Clearing parentTicketId
        // Subtasks must have a parent, so cannot clear it
        if (ticket.ticketType === 'subtask') {
          throw new Error('Subtasks must have a parent ticket')
        }
        // Task/Bug/Story can clear parent (optional)
      }
    } else if (ticket.ticketType === 'subtask' && !ticket.parentTicketId) {
      // Subtasks must have a parentTicketId (if not being updated, check existing)
      throw new Error('Subtasks must have a parent ticket')
    }

    // Validation: Non-epics with rootEpicId must point to an epic
    if (ticket.ticketType !== 'epic' && updates.rootEpicId !== undefined) {
      if (updates.rootEpicId) {
        const epic = await ticketRepository.findById(updates.rootEpicId)
        if (!epic) {
          throw new Error('Root epic not found')
        }
        if (epic.ticketType !== 'epic') {
          throw new Error('Root epic must be of type epic')
        }
      }
    }

    // Validation: parentTicketId rules
    // - For task/bug/story: parentTicketId MUST be an epic
    // - For subtask: parentTicketId can be task/bug/story/epic
    if (updates.parentTicketId !== undefined) {
      if (updates.parentTicketId) {
        const parent = await ticketRepository.findById(updates.parentTicketId)
        if (!parent) {
          throw new Error('Parent ticket not found')
        }
        
        if (ticket.ticketType === 'task' || ticket.ticketType === 'bug' || ticket.ticketType === 'story') {
          // Task/Bug/Story: parent MUST be an epic
          if (parent.ticketType !== 'epic') {
            throw new Error('Task, bug, and story tickets must have an epic as parent')
          }
        } else if (ticket.ticketType === 'subtask') {
          // Subtask: parent cannot be a subtask
          if (parent.ticketType === 'subtask') {
            throw new Error('Subtasks cannot have subtasks as parents')
          }
        } else if (ticket.ticketType === 'epic') {
          // Epics cannot have parentTicketId
          throw new Error('Epics cannot have a parent ticket')
        }
      } else {
        // Clearing parentTicketId
        // Subtasks must have a parent, so cannot clear it
        if (ticket.ticketType === 'subtask') {
          throw new Error('Subtasks must have a parent ticket')
        }
      }
    }

    // Validation: Related tickets
    if (updates.relatedTickets !== undefined) {
      for (const relatedId of updates.relatedTickets) {
        const relatedTicket = await ticketRepository.findById(relatedId)
        if (!relatedTicket) {
          throw new Error(`Related ticket ${relatedId} not found`)
        }
        // Cannot relate to epics or subtasks
        if (relatedTicket.ticketType === 'epic' || relatedTicket.ticketType === 'subtask') {
          throw new Error('Cannot relate to epics or subtasks')
        }
        // Cannot relate to self
        if (relatedId === ticketId) {
          throw new Error('Cannot relate ticket to itself')
        }
      }
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

  async deleteTicket(ticketId: string, userId: string, deletedAt?: Date) {
    const ticket = await ticketRepository.findById(ticketId)
    if (!ticket) {
      return false
    }

    const deleteTimestamp = deletedAt || new Date()

    // Cascade delete: Find all subtasks and recursively delete them
    const subtasks = await ticketRepository.findByParentTicketId(ticketId)
    for (const subtask of subtasks) {
      await this.deleteTicket(subtask.id, userId, deleteTimestamp)
    }

    // Delete the parent ticket
    return ticketRepository.softDelete(ticketId, userId, deleteTimestamp)
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
