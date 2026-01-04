import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { ticketService } from '../../../workspace/tickets/ticket.service'
import { boardService } from '../../../workspace/boards/board.service'
import { userService } from '../../../users/user.service'
import type { Ticket } from '../../../workspace/tickets/ticket.model'

export const searchTicketsTool: AITool = {
  name: 'search_tickets',
  description: 'Search for tickets by board, assignee, or keyword. Returns matching tickets.',
  requiredPermission: [PERMISSIONS.BOARD_VIEW, PERMISSIONS.BOARD_VIEW_ALL],
  parameters: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'Optional: Filter by board ID (get from get_my_boards)',
      },
      assigneeId: {
        type: 'string',
        description: 'Optional: Filter by assignee ID. Use "me" for current user.',
      },
      keyword: {
        type: 'string',
        description: 'Optional: Search in ticket title and description',
      },
    },
  },
  execute: async (params, user) => {
    const { boardId, assigneeId: rawAssigneeId, keyword } = params as {
      boardId?: string
      assigneeId?: string
      keyword?: string
    }
    
    const assigneeId = rawAssigneeId === 'me' ? user.id : rawAssigneeId
    
    // Get user's accessible boards
    const userBoards = await boardService.findByUserId(user.id)
    const accessibleBoardIds = userBoards.map(b => b.id)
    
    // Filter by board if specified
    const targetBoardIds = boardId
      ? (accessibleBoardIds.includes(boardId) ? [boardId] : [])
      : accessibleBoardIds
    
    if (targetBoardIds.length === 0) {
      return { success: false, message: 'No accessible boards found' }
    }
    
    // Get tickets from all accessible boards
    const allTickets: Ticket[] = []
    for (const bid of targetBoardIds) {
      const tickets = await ticketService.findByBoardId(bid)
      allTickets.push(...tickets)
    }
    
    // Filter by assignee
    let filtered = assigneeId
      ? allTickets.filter(t => t.assigneeId === assigneeId)
      : allTickets
    
    // Filter by keyword
    if (keyword) {
      const searchTerm = keyword.toLowerCase()
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchTerm) ||
        (t.description && JSON.stringify(t.description).toLowerCase().includes(searchTerm))
      )
    }
    
    // Get board names and assignee names
    const ticketsWithDetails = await Promise.all(
      filtered.map(async (ticket) => {
        const board = userBoards.find(b => b.id === ticket.boardId)
        const assignee = ticket.assigneeId
          ? await userService.getPublicProfile(ticket.assigneeId)
          : null
        
        return {
          ticketKey: ticket.ticketKey,
          title: ticket.title,
          ticketType: ticket.ticketType,
          boardName: board?.name || 'Unknown',
          assignee: assignee?.name || null,
          priority: ticket.priority,
        }
      })
    )
    
    return {
      success: true,
      tickets: ticketsWithDetails,
      count: ticketsWithDetails.length,
    }
  },
}
