import { commentRepository } from './comment.repository'
import { cardService } from './card.service'

export const commentService = {
  async create(cardId: string, userId: string, content: string) {
    const card = await cardService.findById(cardId)
    if (!card) {
      throw new Error('Card not found')
    }
    return commentRepository.create({ cardId, userId, content })
  },

  async findByCardId(cardId: string) {
    return commentRepository.findByCardId(cardId)
  },

  async findById(id: string) {
    return commentRepository.findById(id)
  },

  async update(id: string, userId: string, content: string) {
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










