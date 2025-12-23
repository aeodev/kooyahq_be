import { GalleryModel, toGalleryItem, type GalleryItem } from './gallery.model'

export type CreateGalleryInput = {
  title: string
  description?: string
  filename: string
  path: string
  mimetype: string
  size: number
  uploadedBy: string
  status?: 'pending' | 'approved'
}

export type UpdateGalleryInput = {
  title?: string
  description?: string
  status?: 'pending' | 'approved'
  approvedBy?: string
}

export class GalleryRepository {
  async create(input: CreateGalleryInput): Promise<GalleryItem> {
    const doc = new GalleryModel(input)
    await doc.save()
    return toGalleryItem(doc)
  }

  async findById(id: string): Promise<GalleryItem | undefined> {
    const doc = await GalleryModel.findById(id)
    return doc ? toGalleryItem(doc) : undefined
  }

  async findAll(): Promise<GalleryItem[]> {
    const docs = await GalleryModel.find().sort({ createdAt: -1 })
    return docs.map((doc) => toGalleryItem(doc as any, ''))
  }

  async searchGalleryItems(params: {
    page?: number
    limit?: number
    search?: string
    sort?: string
    status?: 'pending' | 'approved'
  }): Promise<{ data: GalleryItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = params.page || 1
    const limit = params.limit || 20
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}

    // Status filter
    if (params.status) {
      query.status = params.status
    }

    // Search filter
    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i')
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ]
    }

    // Sort options
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 }
    if (params.sort) {
      if (params.sort === 'title-asc') sortOption = { title: 1 }
      else if (params.sort === 'title-desc') sortOption = { title: -1 }
      else if (params.sort === 'date-asc') sortOption = { createdAt: 1 }
      else if (params.sort === 'date-desc') sortOption = { createdAt: -1 }
    }

    const [docs, total] = await Promise.all([
      GalleryModel.find(query).sort(sortOption).skip(skip).limit(limit).exec(),
      GalleryModel.countDocuments(query),
    ])

    return {
      data: docs.map((doc) => toGalleryItem(doc as any, '')),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async update(id: string, updates: UpdateGalleryInput): Promise<GalleryItem> {
    const doc = await GalleryModel.findByIdAndUpdate(id, updates, { new: true })
    if (!doc) {
      throw new Error('Gallery item not found')
    }
    return toGalleryItem(doc as any, '')
  }

  async delete(id: string): Promise<void> {
    const result = await GalleryModel.findByIdAndDelete(id)
    if (!result) {
      throw new Error('Gallery item not found')
    }
  }
}

