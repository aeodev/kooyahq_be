import { toPublicUser, type PublicUser } from './user.model'
import { userRepository, type CreateUserInput } from './user.repository'

export const userService = {
  findById(id: string) {
    return userRepository.findById(id)
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
    return userRepository.deleteUser(id, softDelete)
  },

  async updateProfile(id: string, updates: { profilePic?: string; banner?: string; bio?: string; status?: string }) {
    return userRepository.updateProfile(id, updates)
  },

  async updateEmployee(id: string, updates: { name?: string; email?: string; position?: string; birthday?: string }) {
    return userRepository.updateEmployee(id, updates)
  },
}
