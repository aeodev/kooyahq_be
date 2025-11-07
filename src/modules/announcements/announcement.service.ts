import { announcementRepository, type CreateAnnouncementInput, type UpdateAnnouncementInput } from './announcement.repository'
import { userRepository } from '../users/user.repository'
import type { Announcement } from './announcement.model'

export type AnnouncementWithAuthor = Announcement & {
  author: {
    id: string
    name: string
    email: string
  }
}

export const announcementService = {
  async create(input: CreateAnnouncementInput): Promise<AnnouncementWithAuthor> {
    const announcement = await announcementRepository.create(input)
    const author = await userRepository.findById(input.authorId)
    
    if (!author) {
      throw new Error('Author not found')
    }

    return {
      ...announcement,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
      },
    }
  },

  async findAll(onlyActive = true): Promise<AnnouncementWithAuthor[]> {
    const announcements = await announcementRepository.findAll(onlyActive)
    
    const authorIds = [...new Set(announcements.map((a) => a.authorId))]
    const authors = await Promise.all(
      authorIds.map(async (id) => {
        const user = await userRepository.findById(id)
        return user ? { id: user.id, name: user.name, email: user.email } : null
      }),
    )

    const authorMap = new Map(
      authors.filter(Boolean).map((a) => [a!.id, a!]),
    )

    return announcements.map((announcement) => ({
      ...announcement,
      author: authorMap.get(announcement.authorId) || {
        id: announcement.authorId,
        name: 'Unknown',
        email: '',
      },
    }))
  },

  async findById(id: string): Promise<AnnouncementWithAuthor | undefined> {
    const announcement = await announcementRepository.findById(id)
    if (!announcement) {
      return undefined
    }

    const author = await userRepository.findById(announcement.authorId)
    if (!author) {
      return undefined
    }

    return {
      ...announcement,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
      },
    }
  },

  async update(id: string, updates: UpdateAnnouncementInput): Promise<AnnouncementWithAuthor | undefined> {
    const announcement = await announcementRepository.update(id, updates)
    if (!announcement) {
      return undefined
    }

    const author = await userRepository.findById(announcement.authorId)
    if (!author) {
      return undefined
    }

    return {
      ...announcement,
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
      },
    }
  },

  async delete(id: string): Promise<boolean> {
    return announcementRepository.delete(id)
  },
}





