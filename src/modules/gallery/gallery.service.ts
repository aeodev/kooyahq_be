import { GalleryRepository, type CreateGalleryInput, type UpdateGalleryInput } from './gallery.repository'
import { HttpError } from '../../utils/http-error'
import { toGalleryItem, type GalleryItem } from './gallery.model'
import { env } from '../../config/env'
import { unlinkSync } from 'fs'
import { join } from 'path'

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
      // Delete the file from filesystem
      try {
        const filePath = join(env.uploadDir, item.filename)
        unlinkSync(filePath)
      } catch (error) {
        // File might already be deleted, continue anyway
        console.warn('Failed to delete file:', error)
      }
    }
    await this.galleryRepo.delete(id)
  }
}

