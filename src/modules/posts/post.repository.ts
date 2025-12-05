import { PostModel, toPost, type Post } from './post.model'

export type CreatePostInput = {
  content: string
  authorId: string
  imageUrl?: string
  category?: string
  tags?: string[]
  draft?: boolean
  poll?: {
    question: string
    options: { text: string; votes?: string[] }[]
    endDate?: Date
  }
}

export type UpdatePostInput = {
  content?: string
  imageUrl?: string
  category?: string
  tags?: string[]
  draft?: boolean
}

export const postRepository = {
  async create(input: CreatePostInput): Promise<Post> {
    const doc = await PostModel.create({
      content: input.content,
      authorId: input.authorId,
      imageUrl: input.imageUrl,
      category: input.category,
      tags: input.tags || [],
      draft: input.draft ?? false,
      poll: input.poll,
    })
    return toPost(doc)
  },

  async update(id: string, updates: UpdatePostInput): Promise<Post | undefined> {
    const updateData: any = { ...updates }
    if (updates.content) {
      updateData.editedAt = new Date()
    }
    const doc = await PostModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toPost(doc) : undefined
  },

  async findAll(): Promise<Post[]> {
    const docs = await PostModel.find({ draft: false }).sort({ createdAt: -1 }).limit(100).exec()
    return docs.map(toPost)
  },


  async findByAuthorId(authorId: string, includeDrafts?: boolean): Promise<Post[]> {
    const filter: any = { authorId }
    if (!includeDrafts) {
      filter.draft = false
    }
    const docs = await PostModel.find(filter).sort({ createdAt: -1 }).limit(100).exec()
    return docs.map(toPost)
  },

  async findById(id: string): Promise<Post | undefined> {
    const doc = await PostModel.findById(id).exec()
    return doc ? toPost(doc) : undefined
  },

  async vote(postId: string, userId: string, optionIndex: number): Promise<Post | undefined> {
    const post = await PostModel.findById(postId).exec()
    if (!post || !post.poll) return undefined

    // Remove user vote from all options
    post.poll.options.forEach((opt: any) => {
      // Ensure votes is initialized
      if (!opt.votes) opt.votes = []
      // Convert to string for comparison safety
      opt.votes = opt.votes.filter((id: string) => String(id) !== String(userId))
    })

    // Add vote to selected option
    if (post.poll.options[optionIndex]) {
      if (!post.poll.options[optionIndex].votes) post.poll.options[optionIndex].votes = []
      post.poll.options[optionIndex].votes.push(userId)
    }

    post.markModified('poll')
    const saved = await post.save()
    return toPost(saved)
  },

  async delete(id: string, authorId: string): Promise<boolean> {
    const result = await PostModel.deleteOne({ _id: id, authorId }).exec()
    return result.deletedCount > 0
  },
}

