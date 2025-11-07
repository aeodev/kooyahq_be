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

  async updateProfile(id: string, updates: { profilePic?: string; banner?: string }) {
    return userRepository.updateProfile(id, updates)
  },

  async updateEmployee(id: string, updates: { name?: string; email?: string; position?: string; birthday?: string; isAdmin?: boolean }) {
    return userRepository.updateEmployee(id, updates)
  },
}
