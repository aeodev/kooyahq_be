import { postReactionRepository, type CreatePostReactionInput } from './post-reaction.repository'
import type { ReactionType } from './post-reaction.model'
import { postRepository } from './post.repository'
import { userService } from '../users/user.service'
import type { PostReaction } from './post-reaction.model'

export type PostReactionWithAuthor = PostReaction & {
  author: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export type ReactionCounts = {
  heart: number
  wow: number
  haha: number
  userReaction?: ReactionType
}

export const postReactionService = {
  async toggle(postId: string, userId: string, type: ReactionType): Promise<PostReactionWithAuthor | null> {
    const post = await postRepository.findById(postId)
    if (!post) {
      throw new Error('Post not found')
    }

    const reaction = await postReactionRepository.toggle(postId, userId, type)
    
    if (!reaction) {
      return null
    }

    const author = await userService.getPublicProfile(userId)
    if (!author) {
      throw new Error('Author not found')
    }

    return {
      ...reaction,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }
  },

  async findByPostId(postId: string): Promise<PostReactionWithAuthor[]> {
    const reactions = await postReactionRepository.findByPostId(postId)
    const userIds = [...new Set(reactions.map((r) => r.userId))]
    
    const authors = await Promise.all(
      userIds.map(async (id) => {
        const author = await userService.getPublicProfile(id)
        return { id, author }
      })
    )

    const authorMap = new Map(
      authors.filter((a) => a.author).map((a) => [a.id, a.author!])
    )

    return reactions.map((reaction) => {
      const author = authorMap.get(reaction.userId)
      return {
        ...reaction,
        author: {
          id: author!.id,
          name: author!.name,
          email: author!.email,
          profilePic: author!.profilePic,
        },
      }
    })
  },

  async getReactionCounts(postId: string, userId?: string): Promise<ReactionCounts> {
    const counts = await postReactionRepository.getReactionCounts(postId)
    
    let userReaction: ReactionType | undefined
    if (userId) {
      const userReactionDoc = await postReactionRepository.findByPostIdAndUserId(postId, userId)
      userReaction = userReactionDoc?.type
    }
    
    return {
      ...counts,
      userReaction,
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const reaction = await postReactionRepository.findById(id)
    if (!reaction) {
      return false
    }
    if (reaction.userId !== userId) {
      throw new Error('Forbidden')
    }
    return postReactionRepository.delete(id)
  },
}

