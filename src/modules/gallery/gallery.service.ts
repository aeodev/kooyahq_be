import { GalleryRepository, type CreateGalleryInput, type UpdateGalleryInput } from './gallery.repository'
import { HttpError } from '../../utils/http-error'
import { toGalleryItem, type GalleryItem } from './gallery.model'
import { deleteFromCloudinary, extractPublicIdFromUrl } from '../../utils/cloudinary'

export class GalleryService {
  private galleryRepo = new GalleryRepository()

  async create(userId: string, input: CreateGalleryInput, baseUrl: string = ''): Promise<GalleryItem> {
    const item = await this.galleryRepo.create({
      ...input,
      uploadedBy: userId,
    })
    return toGalleryItem(item as any, baseUrl)
  }

  async findAll(baseUrl: string = ''): Promise<GalleryItem[]> {
    const items = await this.galleryRepo.findAll()
    return items.map(item => toGalleryItem(item as any, baseUrl))
  }

  async search(params: {
    page?: number
    limit?: number
    search?: string
    sort?: string
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
    if (item) {
      // Delete from Cloudinary if it's a Cloudinary URL
      if (item.path && item.path.startsWith('http')) {
        try {
          const publicId = extractPublicIdFromUrl(item.path) || item.filename
          if (publicId) {
            await deleteFromCloudinary(publicId)
          }
        } catch (error) {
          // File might already be deleted, continue anyway
          console.warn('Failed to delete from Cloudinary:', error)
        }
      }
    }
    await this.galleryRepo.delete(id)
  }
}

