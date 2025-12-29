import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { ticketRepository } from '../../../workspace/tickets/ticket.repository'
import { ticketService } from '../../../workspace/tickets/ticket.service'
import { boardService } from '../../../workspace/boards/board.service'

export const moveTicketTool: AITool = {
  name: 'move_ticket',
  description: 'Move a ticket to a different column/status on its board. Use ticket key (e.g., TB-123) or ID.',
  requiredPermission: PERMISSIONS.BOARD_UPDATE,
  parameters: {
    type: 'object',
    properties: {
      ticketKey: {
        type: 'string',
        description: 'The ticket key (e.g., TB-123) or ticket ID',
      },
      columnName: {
        type: 'string',
        description: 'The name of the column to move to (e.g., "In Progress", "Done")',
      },
    },
    required: ['ticketKey', 'columnName'],
  },
  execute: async (params, user) => {
    const { ticketKey, columnName } = params as { ticketKey: string; columnName: string }
    
    // Find ticket
    let ticket = await ticketRepository.findByTicketKey(ticketKey)
    if (!ticket) {
      ticket = await ticketRepository.findById(ticketKey)
    }
    
    if (!ticket) {
      return { success: false, message: `Ticket "${ticketKey}" not found` }
    }
    
    // Get board and find column
    const board = await boardService.findById(ticket.boardId)
    if (!board) {
      return { success: false, message: 'Board not found' }
    }
    
    const column = board.columns.find(
      col => col.name.toLowerCase() === columnName.toLowerCase()
    )
    
    if (!column) {
      return {
        success: false,
        message: `Column "${columnName}" not found on board "${board.name}"`,
        availableColumns: board.columns.map(col => col.name),
      }
    }
    
    // Move ticket
    await ticketService.updateTicket(ticket.id, { columnId: column.id }, user.id)
    
    return {
      success: true,
      message: `Moved ${ticket.ticketKey} to "${column.name}"`,
      ticket: {
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        status: column.name,
      },
    }
  },
}

