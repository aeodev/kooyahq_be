import { GalleryModel, toGalleryItem, type GalleryItem } from './gallery.model'

export type CreateGalleryInput = {
  title: string
  description?: string
  filename: string
  path: string
  mimetype: string
  size: number
  uploadedBy: string
}

export type UpdateGalleryInput = {
  title?: string
  description?: string
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

