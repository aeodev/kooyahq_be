import { AuthModel, toAuth, type Auth } from './auth.model'

export type CreateAuthInput = {
  email: string
  passwordHash: string
  userId: string
}

export type UpdatePasswordInput = {
  passwordHash: string
}

export const authRepository = {
  async findByEmail(email: string): Promise<Auth | undefined> {
    const doc = await AuthModel.findOne({ email: email.toLowerCase() }).exec()
    return doc ? toAuth(doc) : undefined
  },

  async findByUserId(userId: string): Promise<Auth | undefined> {
    const doc = await AuthModel.findOne({ userId }).exec()
    return doc ? toAuth(doc) : undefined
  },

  async create(input: CreateAuthInput): Promise<Auth> {
    const doc = await AuthModel.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      userId: input.userId,
    })
    return toAuth(doc)
  },

  async updatePassword(userId: string, input: UpdatePasswordInput): Promise<Auth | undefined> {
    const doc = await AuthModel.findOneAndUpdate(
      { userId },
      { $set: { passwordHash: input.passwordHash } },
      { new: true }
    ).exec()
    return doc ? toAuth(doc) : undefined
  },

  async delete(userId: string): Promise<boolean> {
    const result = await AuthModel.deleteOne({ userId }).exec()
    return result.deletedCount > 0
  },
}





