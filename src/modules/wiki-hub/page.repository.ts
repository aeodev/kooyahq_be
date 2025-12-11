import { PageModel, toPage, type Page } from './page.model'

export type CreatePageInput = {
  workspaceId: string
  title: string
  content: Record<string, any>
  authorId: string
  parentPageId?: string
  status?: 'draft' | 'published'
  templateId?: string
  tags?: string[]
  category?: string
  linkedTicketIds?: string[]
  linkedProjectIds?: string[]
}

export type UpdatePageInput = {
  title?: string
  content?: Record<string, any>
  parentPageId?: string
  status?: 'draft' | 'published'
  templateId?: string
  tags?: string[]
  category?: string
  linkedTicketIds?: string[]
  linkedProjectIds?: string[]
}

export class PageRepository {
  async create(input: CreatePageInput): Promise<Page> {
    const page = await PageModel.create({
      workspaceId: input.workspaceId,
      title: input.title,
      content: input.content || {},
      authorId: input.authorId,
      parentPageId: input.parentPageId,
      status: input.status || 'published',
      templateId: input.templateId,
      tags: input.tags || [],
      category: input.category,
      isPinned: false,
      favorites: [],
      linkedTicketIds: input.linkedTicketIds || [],
      linkedProjectIds: input.linkedProjectIds || [],
    })
    return toPage(page)
  }

  async findById(id: string): Promise<Page | null> {
    const page = await PageModel.findOne({
      _id: id,
      deletedAt: { $exists: false },
    }).exec()
    return page ? toPage(page) : null
  }

  async findByWorkspaceId(workspaceId: string): Promise<Page[]> {
    const pages = await PageModel.find({
      workspaceId,
      deletedAt: { $exists: false },
    })
      .sort({ isPinned: -1, updatedAt: -1 })
      .exec()
    return pages.map(toPage)
  }

  async findByParentId(parentPageId: string): Promise<Page[]> {
    const pages = await PageModel.find({
      parentPageId,
      deletedAt: { $exists: false },
    })
      .sort({ title: 1 })
      .exec()
    return pages.map(toPage)
  }

  async findByTag(workspaceId: string, tag: string): Promise<Page[]> {
    const pages = await PageModel.find({
      workspaceId,
      tags: { $in: [tag] },
      deletedAt: { $exists: false },
    })
      .sort({ updatedAt: -1 })
      .exec()
    return pages.map(toPage)
  }

  async findByAuthor(workspaceId: string, authorId: string): Promise<Page[]> {
    const pages = await PageModel.find({
      workspaceId,
      authorId,
      deletedAt: { $exists: false },
    })
      .sort({ updatedAt: -1 })
      .exec()
    return pages.map(toPage)
  }

  async search(workspaceId: string, query: string): Promise<Page[]> {
    const pages = await PageModel.find({
      workspaceId,
      deletedAt: { $exists: false },
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { category: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ updatedAt: -1 })
      .exec()
    return pages.map(toPage)
  }

  async update(id: string, updates: UpdatePageInput): Promise<Page | null> {
    const updateData: any = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.parentPageId !== undefined) updateData.parentPageId = updates.parentPageId
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.templateId !== undefined) updateData.templateId = updates.templateId
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.linkedTicketIds !== undefined) updateData.linkedTicketIds = updates.linkedTicketIds
    if (updates.linkedProjectIds !== undefined) updateData.linkedProjectIds = updates.linkedProjectIds

    const page = await PageModel.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      updateData,
      { new: true },
    ).exec()
    return page ? toPage(page) : null
  }

  async pinPage(id: string): Promise<Page | null> {
    const page = await PageModel.findByIdAndUpdate(id, { isPinned: true }, { new: true }).exec()
    return page ? toPage(page) : null
  }

  async unpinPage(id: string): Promise<Page | null> {
    const page = await PageModel.findByIdAndUpdate(id, { isPinned: false }, { new: true }).exec()
    return page ? toPage(page) : null
  }

  async addFavorite(pageId: string, userId: string): Promise<Page | null> {
    const page = await PageModel.findById(pageId).exec()
    if (!page) return null

    // Check if already favorited
    const existingFavorite = page.favorites.find((f) => f.userId === userId)
    if (existingFavorite) {
      return toPage(page)
    }

    page.favorites.push({
      userId,
      favoritedAt: new Date(),
    })
    await page.save()
    return toPage(page)
  }

  async removeFavorite(pageId: string, userId: string): Promise<Page | null> {
    const page = await PageModel.findById(pageId).exec()
    if (!page) return null

    page.favorites = page.favorites.filter((f) => f.userId !== userId)
    await page.save()
    return toPage(page)
  }

  async getFavorites(workspaceId: string, userId: string): Promise<Page[]> {
    const pages = await PageModel.find({
      workspaceId,
      'favorites.userId': userId,
      deletedAt: { $exists: false },
    })
      .sort({ updatedAt: -1 })
      .exec()
    return pages.map(toPage)
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await PageModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    ).exec()
    return !!result
  }

  async delete(id: string): Promise<boolean> {
    const result = await PageModel.findByIdAndDelete(id).exec()
    return !!result
  }
}

export const pageRepository = new PageRepository()
