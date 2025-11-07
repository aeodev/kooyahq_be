import { AnnouncementModel, toAnnouncement, type Announcement } from './announcement.model'

export type CreateAnnouncementInput = {
  title: string
  content: string
  authorId: string
  isActive?: boolean
  expiresAt?: Date | null
}

export type UpdateAnnouncementInput = {
  title?: string
  content?: string
  isActive?: boolean
  expiresAt?: Date | null
}

export const announcementRepository = {
  async create(input: CreateAnnouncementInput): Promise<Announcement> {
    const isActive = input.isActive !== false

    if (isActive) {
      await AnnouncementModel.updateMany({ isActive: true }, { $set: { isActive: false } }).exec()
    }

    const doc = await AnnouncementModel.create({
      title: input.title,
      content: input.content,
      authorId: input.authorId,
      isActive,
      expiresAt: input.expiresAt ?? null,
    })
    return toAnnouncement(doc)
  },

  async findAll(onlyActive = true): Promise<Announcement[]> {
    const filter: Record<string, any> = {}
    if (onlyActive) {
      filter.isActive = true
      filter.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }
    const query = AnnouncementModel.find(filter).sort({ createdAt: -1 })

    if (onlyActive) {
      query.limit(1)
    } else {
      query.limit(50)
    }

    const docs = await query.exec()
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
