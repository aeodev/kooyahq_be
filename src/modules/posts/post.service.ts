import { postRepository, type CreatePostInput } from './post.repository'
import { userService } from '../users/user.service'
import type { Post } from './post.model'

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
    const post = await postRepository.findById(id)
    if (!post) {
      throw new Error('Post not found')
    }
    if (post.authorId !== authorId) {
      throw new Error('Forbidden')
    }
    
    const updated = await postRepository.update(id, updates)
    if (!updated) {
      throw new Error('Failed to update post')
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
    return postRepository.delete(id, authorId)
  },
}

