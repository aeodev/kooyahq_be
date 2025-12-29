import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { ticketService } from '../../../workspace/tickets/ticket.service'
import { boardService } from '../../../workspace/boards/board.service'

export const createTicketTool: AITool = {
  name: 'create_ticket',
  description: 'Create a new ticket on a board. IMPORTANT: Before calling this, you MUST first call get_my_boards or get_board_by_name to get the board ID. Never ask the user for a board ID directly - always fetch boards first and let them choose by name.',
  requiredPermission: PERMISSIONS.BOARD_CREATE,
  parameters: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'The ID of the board (get this from get_my_boards or get_board_by_name, never ask user for ID)',
      },
      title: {
        type: 'string',
        description: 'The title of the ticket',
      },
      ticketType: {
        type: 'string',
        description: 'The type of ticket',
        enum: ['task', 'bug', 'story', 'epic'],
      },
      description: {
        type: 'string',
        description: 'Optional description of the ticket',
      },
      priority: {
        type: 'string',
        description: 'Priority level',
        enum: ['lowest', 'low', 'medium', 'high', 'highest'],
      },
    },
    required: ['boardId', 'title', 'ticketType'],
  },
  execute: async (params, user) => {
    const { boardId, title, ticketType, description, priority } = params as {
      boardId: string
      title: string
      ticketType: 'task' | 'bug' | 'story' | 'epic'
      description?: string
      priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
    }
    
    // Get board to find first column
    const board = await boardService.findById(boardId)
    if (!board) {
      return {
        success: false,
        message: 'Board not found',
      }
    }
    
    const ticket = await ticketService.create(
      {
        boardId,
        ticketType,
        title,
        description: description ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] } : {},
        priority: priority || 'medium',
        columnId: board.columns[0]?.id,
        rank: `rank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reporterId: user.id,
      },
      user.id
    )
    
    return {
      success: true,
      message: `Created ${ticketType} "${title}" (${ticket.ticketKey})`,
      ticket: {
        id: ticket.id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        ticketType: ticket.ticketType,
      },
    }
  },
}

