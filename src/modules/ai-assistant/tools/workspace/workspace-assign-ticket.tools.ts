import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { ticketService } from '../../../workspace/tickets/ticket.service'
import { ticketRepository } from '../../../workspace/tickets/ticket.repository'
import { userService } from '../../../users/user.service'

export const assignTicketTool: AITool = {
  name: 'assign_ticket',
  description: 'Assign a ticket to a user. Use the ticket key (like TB-1) or ticket ID.',
  requiredPermission: PERMISSIONS.BOARD_UPDATE,
  parameters: {
    type: 'object',
    properties: {
      ticketKey: {
        type: 'string',
        description: 'The ticket key (e.g., TB-1) or ticket ID',
      },
      assigneeId: {
        type: 'string',
        description: 'The user ID to assign the ticket to. Use "me" to assign to the current user.',
      },
    },
    required: ['ticketKey', 'assigneeId'],
  },
  execute: async (params, user) => {
    const { ticketKey, assigneeId } = params as { ticketKey: string; assigneeId: string }
    
    // Resolve "me" to current user
    const resolvedAssigneeId = assigneeId === 'me' ? user.id : assigneeId
    
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
    
    // Get assignee name for confirmation
    const assignee = await userService.getPublicProfile(resolvedAssigneeId)
    if (!assignee) {
      return {
        success: false,
        message: 'User not found',
      }
    }
    
    // Update the ticket
    await ticketService.updateTicket(ticket.id, { assigneeId: resolvedAssigneeId }, user.id)
    
    return {
      success: true,
      message: `Assigned ${ticket.ticketKey} to ${assignee.name}`,
      ticket: {
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        assignee: assignee.name,
      },
    }
  },
}

