import { postCommentRepository, type CreatePostCommentInput } from './post-comment.repository'
import { postRepository } from './post.repository'
import { extractMentions } from '../../utils/mentions'
import { userService } from '../users/user.service'
import type { PostComment } from './post-comment.model'

export type PostCommentWithAuthor = PostComment & {
  author: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export const postCommentService = {
  async create(input: CreatePostCommentInput): Promise<PostCommentWithAuthor> {
    const post = await postRepository.findById(input.postId)
    if (!post) {
      throw new Error('Post not found')
    }

    const mentions = extractMentions(input.content)
    const comment = await postCommentRepository.create({
      ...input,
      mentions,
    })

    const author = await userService.getPublicProfile(input.userId)
    if (!author) {
      throw new Error('Author not found')
    }

    return {
      ...comment,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }
  },

  async findByPostId(postId: string): Promise<PostCommentWithAuthor[]> {
    const comments = await postCommentRepository.findByPostId(postId)
    const userIds = [...new Set(comments.map((c) => c.userId))]
    
    const authors = await Promise.all(
      userIds.map(async (id) => {
        const author = await userService.getPublicProfile(id)
        return { id, author }
      })
    )

    const authorMap = new Map(
      authors.filter((a) => a.author).map((a) => [a.id, a.author!])
    )

    return comments.map((comment) => {
      const author = authorMap.get(comment.userId)
      return {
        ...comment,
        author: {
          id: author!.id,
          name: author!.name,
          email: author!.email,
          profilePic: author!.profilePic,
        },
      }
    })
  },

  async findById(id: string): Promise<PostCommentWithAuthor | undefined> {
    const comment = await postCommentRepository.findById(id)
    if (!comment) {
      return undefined
    }

    const author = await userService.getPublicProfile(comment.userId)
    if (!author) {
      return undefined
    }

    return {
      ...comment,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }
  },

  async update(id: string, userId: string, content: string): Promise<PostCommentWithAuthor> {
    const comment = await postCommentRepository.findById(id)
    if (!comment) {
      throw new Error('Comment not found')
    }
    if (comment.userId !== userId) {
      throw new Error('Forbidden')
    }

    const mentions = extractMentions(content)
    const updated = await postCommentRepository.update(id, content, mentions)
    if (!updated) {
      throw new Error('Failed to update comment')
    }

    const author = await userService.getPublicProfile(userId)
    if (!author) {
      throw new Error('Author not found')
    }

    return {
      ...updated,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const comment = await postCommentRepository.findById(id)
    if (!comment) {
      return false
    }
    if (comment.userId !== userId) {
      throw new Error('Forbidden')
    }
    return postCommentRepository.delete(id)
  },
}







