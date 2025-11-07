import { AnnouncementModel, toAnnouncement, type Announcement } from './announcement.model'

export type CreateAnnouncementInput = {
  title: string
  content: string
  authorId: string
  isActive?: boolean
}

export type UpdateAnnouncementInput = {
  title?: string
  content?: string
  isActive?: boolean
}

export const announcementRepository = {
  async create(input: CreateAnnouncementInput): Promise<Announcement> {
    const doc = await AnnouncementModel.create({
      title: input.title,
      content: input.content,
      authorId: input.authorId,
      isActive: input.isActive ?? true,
    })
    return toAnnouncement(doc)
  },

  async findAll(onlyActive = true): Promise<Announcement[]> {
    const filter: any = {}
    if (onlyActive) {
      filter.isActive = true
    }
    const docs = await AnnouncementModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec()
    return docs.map(toAnnouncement)
  },

  async findById(id: string): Promise<Announcement | undefined> {
    const doc = await AnnouncementModel.findById(id).exec()
    return doc ? toAnnouncement(doc) : undefined
  },

  async update(id: string, updates: UpdateAnnouncementInput): Promise<Announcement | undefined> {
    const doc = await AnnouncementModel.findByIdAndUpdate(id, updates, { new: true }).exec()
    return doc ? toAnnouncement(doc) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const result = await AnnouncementModel.deleteOne({ _id: id }).exec()
    return result.deletedCount > 0
  },
}

