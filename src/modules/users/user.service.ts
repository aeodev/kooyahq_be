import { toPublicUser, type PublicUser } from './user.model'
import { userRepository, type CreateUserInput } from './user.repository'
import { deleteStorageObject, isStoragePath } from '../../lib/storage'

export const userService = {
  findById(id: string) {
    return userRepository.findById(id)
  },

  async findByEmail(email: string): Promise<PublicUser | undefined> {
    return userRepository.findByEmail(email)
  },

  async getPublicProfile(id: string): Promise<PublicUser | undefined> {
    return userRepository.getPublicProfile(id)
  },

  async create(input: CreateUserInput) {
    return userRepository.create(input)
  },

  async findAll() {
    return userRepository.findAll()
  },

  async searchUsers(params: {
    page?: number
    limit?: number
    search?: string
  }) {
    return userRepository.searchUsers(params)
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

  async updateProfile(id: string, updates: { profilePic?: string; banner?: string; bio?: string; status?: string }) {
    const existing = await userRepository.findById(id)
    const updated = await userRepository.updateProfile(id, updates)

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

  async updateEmployee(id: string, updates: { name?: string; email?: string; position?: string; birthday?: string; status?: string; permissions?: string[]; bio?: string }) {
    return userRepository.updateEmployee(id, updates)
  },
}
