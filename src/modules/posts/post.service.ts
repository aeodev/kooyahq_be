import { postRepository, type CreatePostInput } from './post.repository'
import { PostModel } from './post.model'
import { userService } from '../users/user.service'
import type { Post } from './post.model'
import { deleteStorageObject, isStoragePath } from '../../lib/storage'

export type PostWithAuthor = Post & {
  author: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export const postService = {
  async create(input: CreatePostInput): Promise<PostWithAuthor> {
    const post = await postRepository.create(input)
    const author = await userService.getPublicProfile(input.authorId)

    if (!author) {
      throw new Error('Author not found')
    }

    return {
      ...post,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }
  },

  async update(id: string, authorId: string, updates: import('./post.repository').UpdatePostInput): Promise<PostWithAuthor> {
    const existing = await PostModel.findById(id).exec()
    if (!existing) {
      throw new Error('Post not found')
    }
    if (existing.authorId !== authorId) {
      throw new Error('Forbidden')
    }

    const updated = await postRepository.update(id, updates)
    if (!updated) {
      throw new Error('Failed to update post')
    }

    if (updates.imageUrl && existing.imageUrl && existing.imageUrl !== updates.imageUrl && isStoragePath(existing.imageUrl)) {
      try {
        await deleteStorageObject(existing.imageUrl)
      } catch (error) {
        console.warn('Failed to delete old post image from storage:', error)
      }
    }

    const author = await userService.getPublicProfile(authorId)
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

  async findById(id: string): Promise<PostWithAuthor | undefined> {
    const post = await postRepository.findById(id)
    if (!post) {
      return undefined
    }

    const author = await userService.getPublicProfile(post.authorId)
    if (!author) {
      return undefined
    }

    return {
      ...post,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }
  },


  async findAll(): Promise<PostWithAuthor[]> {
    const posts = await postRepository.findAll()
    const authorIds = [...new Set(posts.map((p) => p.authorId))]
    const authors = await Promise.all(
      authorIds.map(async (id) => {
        const author = await userService.getPublicProfile(id)
        return { id, author }
      })
    )

    const authorMap = new Map(
      authors.filter((a) => a.author).map((a) => [a.id, a.author!])
    )

    return posts.map((post) => {
      const author = authorMap.get(post.authorId)
      return {
        ...post,
        author: {
          id: author!.id,
          name: author!.name,
          email: author!.email,
          profilePic: author!.profilePic,
        },
      }
    })
  },

  async findByAuthorId(authorId: string, includeDrafts?: boolean): Promise<PostWithAuthor[]> {
    const posts = await postRepository.findByAuthorId(authorId, includeDrafts)
    const author = await userService.getPublicProfile(authorId)

    if (!author) {
      return []
    }

    return posts.map((post) => ({
      ...post,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        profilePic: author.profilePic,
      },
    }))
  },

  async delete(id: string, authorId: string): Promise<boolean> {
    const existing = await PostModel.findById(id).exec()
    if (!existing || existing.authorId !== authorId) {
      return false
    }

    const deleted = await postRepository.delete(id, authorId)
    if (deleted && existing.imageUrl && isStoragePath(existing.imageUrl)) {
      try {
        await deleteStorageObject(existing.imageUrl)
      } catch (error) {
        console.warn('Failed to delete post image from storage:', error)
      }
    }
    return deleted
  },
  
  async vote(postId: string, userId: string, optionIndex: number): Promise<PostWithAuthor> {
    const updated = await postRepository.vote(postId, userId, optionIndex)
    if (!updated) {
      throw new Error('Post not found or poll invalid')
    }

    const author = await userService.getPublicProfile(updated.authorId)
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
}
