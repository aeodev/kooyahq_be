import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { ticketRepository } from '../../../workspace/tickets/ticket.repository'
import { ticketService } from '../../../workspace/tickets/ticket.service'

export const updateTicketTool: AITool = {
  name: 'update_ticket',
  description: 'Update ticket fields like title, description, or priority. Use ticket key (e.g., TB-123) or ID.',
  requiredPermission: PERMISSIONS.BOARD_UPDATE,
  parameters: {
    type: 'object',
    properties: {
      ticketKey: {
        type: 'string',
        description: 'The ticket key (e.g., TB-123) or ticket ID',
      },
      title: {
        type: 'string',
        description: 'Optional: New title',
      },
      description: {
        type: 'string',
        description: 'Optional: New description',
      },
      priority: {
        type: 'string',
        enum: ['lowest', 'low', 'medium', 'high', 'highest'],
        description: 'Optional: New priority level',
      },
    },
    required: ['ticketKey'],
  },
  execute: async (params, user) => {
    const { ticketKey, title, description, priority } = params as {
      ticketKey: string
      title?: string
      description?: string
      priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
    }
    
    // Find ticket
    let ticket = await ticketRepository.findByTicketKey(ticketKey)
    if (!ticket) {
      ticket = await ticketRepository.findById(ticketKey)
    }
    
    if (!ticket) {
      return { success: false, message: `Ticket "${ticketKey}" not found` }
    }
    
    // Build updates
    const updates: any = {}
    if (title !== undefined) updates.title = title.trim()
    if (priority !== undefined) updates.priority = priority
    if (description !== undefined) {
      updates.description = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return { success: false, message: 'No updates provided' }
    }
    
    // Update ticket
    const updated = await ticketService.updateTicket(ticket.id, updates, user.id)
    
    if (!updated) {
      return { success: false, message: 'Failed to update ticket' }
    }
    
    return {
      success: true,
      message: `Updated ${ticket.ticketKey}`,
      ticket: {
        ticketKey: updated.ticketKey,
        title: updated.title,
        priority: updated.priority,
      },
    }
  },
}

