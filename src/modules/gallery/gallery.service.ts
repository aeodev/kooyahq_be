import { GalleryRepository, type CreateGalleryInput, type UpdateGalleryInput } from './gallery.repository'
import { HttpError } from '../../utils/http-error'
import { toGalleryItem, type GalleryItem } from './gallery.model'
import { deleteStorageObject, isStoragePath } from '../../lib/storage'

export class GalleryService {
  private galleryRepo = new GalleryRepository()

  async create(userId: string, input: CreateGalleryInput, baseUrl: string = ''): Promise<GalleryItem> {
    const item = await this.galleryRepo.create({
      ...input,
      uploadedBy: userId,
      status: 'pending',
    })
    return toGalleryItem(item as any, baseUrl)
  }

  async approve(id: string, approvedBy: string, baseUrl: string = ''): Promise<GalleryItem> {
    const item = await this.galleryRepo.update(id, {
      status: 'approved',
      approvedBy,
    })
    return toGalleryItem(item as any, baseUrl)
  }

  async findAll(baseUrl: string = '', status?: 'pending' | 'approved'): Promise<GalleryItem[]> {
    const items = await this.galleryRepo.findAll()
    const filtered = status ? items.filter(item => (item as any).status === status) : items
    return filtered.map(item => toGalleryItem(item as any, baseUrl))
  }

  async search(params: {
    page?: number
    limit?: number
    search?: string
    sort?: string
    status?: 'pending' | 'approved'
  }, baseUrl: string = ''): Promise<{ data: GalleryItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const result = await this.galleryRepo.searchGalleryItems(params)
    return {
      data: result.data.map(item => toGalleryItem(item as any, baseUrl)),
      pagination: result.pagination,
    }
  }

  async findById(id: string, baseUrl: string = ''): Promise<GalleryItem> {
    const item = await this.galleryRepo.findById(id)
    if (!item) {
      throw new HttpError(404, 'Gallery item not found')
    }
    return toGalleryItem(item as any, baseUrl)
  }

  async update(id: string, updates: UpdateGalleryInput, baseUrl: string = ''): Promise<GalleryItem> {
    const item = await this.galleryRepo.update(id, updates)
    return toGalleryItem(item as any, baseUrl)
  }

  async delete(id: string): Promise<void> {
    const item = await this.galleryRepo.findById(id)
    await this.galleryRepo.delete(id)
    if (item && isStoragePath(item.path)) {
      try {
        await deleteStorageObject(item.path)
      } catch (error) {
        // File might already be deleted, continue anyway
        console.warn('Failed to delete from storage:', error)
      }
    }
  }
}
