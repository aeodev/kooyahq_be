import { UserModel, toPublicUser, toUser, type PublicUser, type PublicUserOptions, type User } from './user.model'

export type CreateUserInput = {
  email: string
  name: string
  permissions?: string[]
  position?: string
  birthday?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
  bio?: string
}

export const userRepository = {
  async findById(id: string): Promise<User | undefined> {
    const doc = await UserModel.findById(id).exec()
    return doc ? toUser(doc) : undefined
  },

  async findByEmail(email: string, options?: PublicUserOptions): Promise<PublicUser | undefined> {
    const doc = await UserModel.findOne({
      email: email.toLowerCase(),
      deletedAt: undefined,
    }).exec()
    return doc ? toPublicUser(toUser(doc), options) : undefined
  },

  async findByEmailRaw(email: string): Promise<User | undefined> {
    const doc = await UserModel.findOne({
      email: email.toLowerCase(),
      deletedAt: undefined,
    }).exec()
    return doc ? toUser(doc) : undefined
  },

  async getPublicProfile(id: string, options?: PublicUserOptions): Promise<PublicUser | undefined> {
    const doc = await UserModel.findById(id).exec()
    return doc ? toPublicUser(toUser(doc), options) : undefined
  },

  async create(input: CreateUserInput, options?: PublicUserOptions): Promise<PublicUser> {
    const doc = await UserModel.create({
      email: input.email.toLowerCase(),
      name: input.name,
      permissions: Array.isArray(input.permissions) ? input.permissions : [],
      position: input.position?.trim() || undefined,
      birthday: input.birthday ? new Date(input.birthday) : undefined,
      status: input.status || 'online',
      bio: input.bio ?? '',
    })

    return toPublicUser(toUser(doc), options)
  },

  async findAll(options?: PublicUserOptions): Promise<PublicUser[]> {
    const docs = await UserModel.find({ deletedAt: undefined }).sort({ name: 1 }).exec()
    return docs.map((doc) => toPublicUser(toUser(doc), options))
  },

  async findPublicByIds(ids: string[], options?: PublicUserOptions): Promise<PublicUser[]> {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const docs = await UserModel.find({
      _id: { $in: ids },
      deletedAt: undefined,
    }).exec()
    return docs.map((doc) => toPublicUser(toUser(doc), options))
  },

  async searchUsers(params: {
    page?: number
    limit?: number
    search?: string
  }, options?: PublicUserOptions): Promise<{ data: PublicUser[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = params.page || 1
    const limit = params.limit || 50
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = { deletedAt: undefined }

    // Search filter
    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i')
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { position: searchRegex },
      ]
    }

    const [docs, total] = await Promise.all([
      UserModel.find(query).sort({ name: 1 }).skip(skip).limit(limit).exec(),
      UserModel.countDocuments(query),
    ])

    return {
      data: docs.map((doc) => toPublicUser(toUser(doc), options)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },

  async deleteUser(id: string, softDelete = true): Promise<boolean> {
    if (softDelete) {
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { $set: { deletedAt: new Date() } },
        { new: true }
      ).exec()
      return !!doc
    } else {
      const result = await UserModel.findByIdAndDelete(id).exec()
      return !!result
    }
  },

  async updateProfile(
    id: string,
    updates: { profilePic?: string; banner?: string; bio?: string; status?: string },
    options?: PublicUserOptions,
  ): Promise<PublicUser | undefined> {
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).exec()
    return doc ? toPublicUser(toUser(doc), options) : undefined
  },

  async updateEmployee(
    id: string,
    updates: { name?: string; email?: string; position?: string; birthday?: string; status?: string; permissions?: string[]; bio?: string; monthlySalary?: number },
    options?: PublicUserOptions,
  ): Promise<PublicUser | undefined> {
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
    if (updates.status !== undefined) {
      updateData.status = updates.status
    }
    if (updates.bio !== undefined) {
      updateData.bio = updates.bio
    }
    if (updates.permissions !== undefined) {
      updateData.permissions = updates.permissions
    }
    if (updates.monthlySalary !== undefined) {
      updateData.monthlySalary = Math.max(0, updates.monthlySalary)
    }

    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).exec()
    return doc ? toPublicUser(toUser(doc), options) : undefined
  },
}
