import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { ticketRepository } from '../../../workspace/tickets/ticket.repository'
import { boardService } from '../../../workspace/boards/board.service'
import { userService } from '../../../users/user.service'

export const getTicketDetailsTool: AITool = {
  name: 'get_ticket_details',
  description: 'Get detailed information about a ticket by its key (e.g., TB-123) or ID.',
  requiredPermission: [PERMISSIONS.BOARD_VIEW, PERMISSIONS.BOARD_VIEW_ALL],
  parameters: {
    type: 'object',
    properties: {
      ticketKey: {
        type: 'string',
        description: 'The ticket key (e.g., TB-123) or ticket ID',
      },
    },
    required: ['ticketKey'],
  },
  execute: async (params, user) => {
    const { ticketKey } = params as { ticketKey: string }
    
    // Find ticket by key or ID
    let ticket = await ticketRepository.findByTicketKey(ticketKey)
    if (!ticket) {
      ticket = await ticketRepository.findById(ticketKey)
    }
    
    if (!ticket) {
      return {
        success: false,
        message: `Ticket "${ticketKey}" not found`,
      }
    }
    
    // Get board to check access
    const board = await boardService.findById(ticket.boardId)
    if (!board) {
      return { success: false, message: 'Board not found' }
    }
    
    // Check user has access to board
    const userBoards = await boardService.findByUserId(user.id)
    if (!userBoards.some(b => b.id === board.id)) {
      return { success: false, message: 'You do not have access to this ticket' }
    }
    
    // Get assignee name if exists
    let assigneeName = null
    if (ticket.assigneeId) {
      const assignee = await userService.getPublicProfile(ticket.assigneeId)
      assigneeName = assignee?.name || null
    }
    
    // Get column name
    const column = board.columns.find(col => col.id === ticket.columnId)
    
    return {
      success: true,
      ticket: {
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        ticketType: ticket.ticketType,
        status: column?.name || 'Unknown',
        priority: ticket.priority,
        assignee: assigneeName,
        reporter: user.id === ticket.reporterId ? 'You' : null,
        description: ticket.description,
      },
    }
  },
}
