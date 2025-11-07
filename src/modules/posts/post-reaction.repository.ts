import { PostReactionModel, toPostReaction, type PostReaction } from './post-reaction.model'
import type { ReactionType } from './post-reaction.model'

export type { ReactionType }

export type CreatePostReactionInput = {
  postId: string
  userId: string
  type: ReactionType
}

export const postReactionRepository = {
  async create(input: CreatePostReactionInput): Promise<PostReaction> {
    const doc = await PostReactionModel.create(input)
    return toPostReaction(doc)
  },

  async findByPostId(postId: string): Promise<PostReaction[]> {
    const docs = await PostReactionModel.find({ postId }).sort({ createdAt: -1 }).exec()
    return docs.map(toPostReaction)
  },

  async findByPostIdAndUserId(postId: string, userId: string): Promise<PostReaction | undefined> {
    const doc = await PostReactionModel.findOne({ postId, userId }).exec()
    return doc ? toPostReaction(doc) : undefined
  },

  async findById(id: string): Promise<PostReaction | undefined> {
    const doc = await PostReactionModel.findById(id).exec()
    return doc ? toPostReaction(doc) : undefined
  },

  async update(id: string, type: ReactionType): Promise<PostReaction | undefined> {
    const doc = await PostReactionModel.findByIdAndUpdate(id, { type }, { new: true }).exec()
    return doc ? toPostReaction(doc) : undefined
  },

  async toggle(postId: string, userId: string, type: ReactionType): Promise<PostReaction | null> {
    const existing = await this.findByPostIdAndUserId(postId, userId)
    
    if (existing) {
      if (existing.type === type) {
        // Same reaction type, remove it
        await PostReactionModel.findByIdAndDelete(existing.id).exec()
        return null
      } else {
        // Different reaction type, update it
        const updated = await this.update(existing.id, type)
        return updated || null
      }
    } else {
      // No existing reaction, create new
      return await this.create({ postId, userId, type })
    }
  },

  async delete(id: string): Promise<boolean> {
    const result = await PostReactionModel.findByIdAndDelete(id).exec()
    return !!result
  },

  async deleteByPostId(postId: string): Promise<number> {
    const result = await PostReactionModel.deleteMany({ postId }).exec()
    return result.deletedCount || 0
  },

  async getReactionCounts(postId: string): Promise<Record<ReactionType, number>> {
    const reactions = await PostReactionModel.find({ postId }).exec()
    const counts: Record<ReactionType, number> = {
      heart: 0,
      wow: 0,
      haha: 0,
    }
    
    reactions.forEach((reaction) => {
      counts[reaction.type as ReactionType] = (counts[reaction.type as ReactionType] || 0) + 1
    })
    
    return counts
  },
}

