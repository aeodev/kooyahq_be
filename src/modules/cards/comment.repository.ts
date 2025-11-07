import { CommentModel, toComment, type Comment } from './comment.model'

export type CreateCommentInput = {
  cardId: string
  userId: string
  content: string
}

export const commentRepository = {
  async create(input: CreateCommentInput): Promise<Comment> {
    const doc = await CommentModel.create(input)
    return toComment(doc)
  },

  async findByCardId(cardId: string): Promise<Comment[]> {
    const docs = await CommentModel.find({ cardId }).sort({ createdAt: 1 }).exec()
    return docs.map((doc) => toComment(doc))
  },

  async findById(id: string): Promise<Comment | undefined> {
    const doc = await CommentModel.findById(id).exec()
    return doc ? toComment(doc) : undefined
  },

  async update(id: string, content: string): Promise<Comment | undefined> {
    const doc = await CommentModel.findByIdAndUpdate(id, { content: content.trim() }, { new: true }).exec()
    return doc ? toComment(doc) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const result = await CommentModel.findByIdAndDelete(id).exec()
    return !!result
  },
}










