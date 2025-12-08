import { commentRepository } from './comment.repository'
import { ticketService } from '../tickets/ticket.service'

export const commentService = {
  async create(ticketId: string, userId: string, content: Record<string, any>) {
    const ticket = await ticketService.findById(ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }
    return commentRepository.create({ ticketId, userId, content })
  },

  async findByTicketId(ticketId: string) {
    return commentRepository.findByTicketId(ticketId)
  },

  async findById(id: string) {
    return commentRepository.findById(id)
  },

  async update(id: string, userId: string, content: Record<string, any>) {
    const comment = await commentRepository.findById(id)
    if (!comment) {
      throw new Error('Comment not found')
    }
    if (comment.userId !== userId) {
      throw new Error('Forbidden')
    }
    return commentRepository.update(id, content)
  },

  async delete(id: string, userId: string) {
    const comment = await commentRepository.findById(id)
    if (!comment) {
      return false
    }
    if (comment.userId !== userId) {
      throw new Error('Forbidden')
    }
    return commentRepository.delete(id)
  },
}

