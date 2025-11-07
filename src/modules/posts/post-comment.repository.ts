import { PostCommentModel, toPostComment, type PostComment } from './post-comment.model'

export type CreatePostCommentInput = {
  postId: string
  userId: string
  content: string
  mentions?: string[]
}

export const postCommentRepository = {
  async create(input: CreatePostCommentInput): Promise<PostComment> {
    const doc = await PostCommentModel.create({
      postId: input.postId,
      userId: input.userId,
      content: input.content,
      mentions: input.mentions || [],
    })
    return toPostComment(doc)
  },

  async findByPostId(postId: string): Promise<PostComment[]> {
    const docs = await PostCommentModel.find({ postId }).sort({ createdAt: 1 }).exec()
    return docs.map(toPostComment)
  },

  async findById(id: string): Promise<PostComment | undefined> {
    const doc = await PostCommentModel.findById(id).exec()
    return doc ? toPostComment(doc) : undefined
  },

  async update(id: string, content: string, mentions?: string[]): Promise<PostComment | undefined> {
    const updateData: any = { content: content.trim() }
    if (mentions) {
      updateData.mentions = mentions
    }
    const doc = await PostCommentModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toPostComment(doc) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const result = await PostCommentModel.findByIdAndDelete(id).exec()
    return !!result
  },

  async deleteByPostId(postId: string): Promise<number> {
    const result = await PostCommentModel.deleteMany({ postId }).exec()
    return result.deletedCount || 0
  },
}







