import { UserModel, toPublicUser, toUser, type PublicUser, type User } from './user.model'

export type CreateUserInput = {
  email: string
  name: string
}

export const userRepository = {
  async findById(id: string): Promise<User | undefined> {
    const doc = await UserModel.findById(id).exec()
    return doc ? toUser(doc) : undefined
  },

  async getPublicProfile(id: string): Promise<PublicUser | undefined> {
    const doc = await UserModel.findById(id).exec()
    return doc ? toPublicUser(toUser(doc)) : undefined
  },

  async create(input: CreateUserInput): Promise<PublicUser> {
    const doc = await UserModel.create({
      email: input.email.toLowerCase(),
      name: input.name,
    })

    return toPublicUser(toUser(doc))
  },

  async findAll(): Promise<PublicUser[]> {
    const docs = await UserModel.find({}).sort({ name: 1 }).exec()
    return docs.map((doc) => toPublicUser(toUser(doc)))
  },

  async updateProfile(id: string, updates: { profilePic?: string; banner?: string; bio?: string; status?: string }): Promise<PublicUser | undefined> {
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).exec()
    return doc ? toPublicUser(toUser(doc)) : undefined
  },

  async updateEmployee(id: string, updates: { name?: string; email?: string; position?: string; birthday?: string; isAdmin?: boolean }): Promise<PublicUser | undefined> {
    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim()
    }
    if (updates.email !== undefined) {
      updateData.email = updates.email.toLowerCase().trim()
    }
    if (updates.position !== undefined) {
      updateData.position = updates.position.trim() || undefined
    }
    if (updates.birthday !== undefined) {
      updateData.birthday = updates.birthday ? new Date(updates.birthday) : undefined
    }
    if (updates.isAdmin !== undefined) {
      updateData.isAdmin = updates.isAdmin
    }

    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).exec()
    return doc ? toPublicUser(toUser(doc)) : undefined
  },
}
