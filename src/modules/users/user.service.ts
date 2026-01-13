import type { PublicUser, PublicUserOptions, User } from './user.model'
import { userRepository, type CreateUserInput } from './user.repository'
import { deleteStorageObject, isStoragePath } from '../../lib/storage'

export const userService = {
  findById(id: string) {
    return userRepository.findById(id)
  },

  async findByEmail(email: string, options?: PublicUserOptions): Promise<PublicUser | undefined> {
    return userRepository.findByEmail(email, options)
  },

  async findByEmailRaw(email: string): Promise<User | undefined> {
    return userRepository.findByEmailRaw(email)
  },

  async getPublicProfile(id: string, options?: PublicUserOptions): Promise<PublicUser | undefined> {
    return userRepository.getPublicProfile(id, options)
  },

  async create(input: CreateUserInput, options?: PublicUserOptions) {
    return userRepository.create(input, options)
  },

  async findAll(options?: PublicUserOptions) {
    return userRepository.findAll(options)
  },

  async findPublicByIds(ids: string[], options?: PublicUserOptions) {
    return userRepository.findPublicByIds(ids, options)
  },

  async searchUsers(params: {
    page?: number
    limit?: number
    search?: string
  }, options?: PublicUserOptions) {
    return userRepository.searchUsers(params, options)
  },

  async deleteUser(id: string, softDelete = true) {
    const existing = softDelete ? undefined : await userRepository.findById(id)
    const deleted = await userRepository.deleteUser(id, softDelete)

    if (deleted && existing && !softDelete) {
      if (existing.profilePic && isStoragePath(existing.profilePic)) {
        try {
          await deleteStorageObject(existing.profilePic)
        } catch (error) {
          console.warn('Failed to delete user profile image from storage:', error)
        }
      }
      if (existing.banner && isStoragePath(existing.banner)) {
        try {
          await deleteStorageObject(existing.banner)
        } catch (error) {
          console.warn('Failed to delete user banner image from storage:', error)
        }
      }
    }

    return deleted
  },

  async updateProfile(
    id: string,
    updates: { profilePic?: string; banner?: string; bio?: string; status?: string },
    options?: PublicUserOptions,
  ) {
    const existing = await userRepository.findById(id)
    const updated = await userRepository.updateProfile(id, updates, options)

    if (existing) {
      if (updates.profilePic && existing.profilePic && existing.profilePic !== updates.profilePic && isStoragePath(existing.profilePic)) {
        try {
          await deleteStorageObject(existing.profilePic)
        } catch (error) {
          console.warn('Failed to delete old profile image from storage:', error)
        }
      }
      if (updates.banner && existing.banner && existing.banner !== updates.banner && isStoragePath(existing.banner)) {
        try {
          await deleteStorageObject(existing.banner)
        } catch (error) {
          console.warn('Failed to delete old banner image from storage:', error)
        }
      }
    }

    return updated
  },

  async updateEmployee(
    id: string,
    updates: { name?: string; email?: string; position?: string; birthday?: string; status?: string; permissions?: string[]; bio?: string; monthlySalary?: number },
    options?: PublicUserOptions,
  ) {
    return userRepository.updateEmployee(id, updates, options)
  },
}
