import { Request, Response } from 'express'
import { GalleryService } from './gallery.service'
import type { CreateGalleryInput, UpdateGalleryInput } from './gallery.repository'
import { env } from '../../config/env'

const service = new GalleryService()

function getBaseUrl(req: Request): string {
  const protocol = req.protocol
  const host = req.get('host')
  return `${protocol}://${host}/api`
}

export async function createGalleryItem(req: Request, res: Response) {
  const userId = req.user!.id
  const file = req.file

  if (!file) {
    return res.status(400).json({ status: 'error', message: 'Image file is required' })
  }

  const title = req.body.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '')
  const description = req.body.description?.trim()

  const input: CreateGalleryInput = {
    title,
    description,
    filename: file.filename,
    path: file.path,
    mimetype: file.mimetype,
    size: file.size,
    uploadedBy: userId,
  }

  const baseUrl = getBaseUrl(req)
  const item = await service.create(userId, input, baseUrl)
  res.status(201).json({ status: 'success', data: item })
}

export async function createMultipleGalleryItems(req: Request, res: Response) {
  const userId = req.user!.id
  const files = Array.isArray(req.files) ? req.files : []

  if (!files || files.length === 0) {
    return res.status(400).json({ status: 'error', message: 'At least one image file is required' })
  }

  const items: CreateGalleryInput[] = []
  const baseUrl = getBaseUrl(req)

  files.forEach((file, index) => {
    // Try to get per-image title/description by index, fallback to generic or filename
    const title = req.body[`title-${index}`]?.trim() 
      || req.body[`title-${file.fieldname}`]?.trim() 
      || file.originalname.replace(/\.[^/.]+$/, '')
    const description = req.body[`description-${index}`]?.trim() 
      || req.body[`description-${file.fieldname}`]?.trim()

    const input: CreateGalleryInput = {
      title,
      description,
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: userId,
    }

    items.push(input)
  })

  // Create all items
  const createdItems = await Promise.all(
    items.map((input) => service.create(userId, input, baseUrl))
  )

  res.status(201).json({ status: 'success', data: createdItems })
}

export async function getGalleryItems(req: Request, res: Response) {
  const baseUrl = getBaseUrl(req)
  const items = await service.findAll(baseUrl)
  res.json({ status: 'success', data: items })
}

export async function getGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  const baseUrl = getBaseUrl(req)
  const item = await service.findById(id, baseUrl)
  res.json({ status: 'success', data: item })
}

export async function updateGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  const updates: UpdateGalleryInput = {
    title: req.body.title?.trim(),
    description: req.body.description?.trim(),
  }
  const baseUrl = getBaseUrl(req)
  const item = await service.update(id, updates, baseUrl)
  res.json({ status: 'success', data: item })
}

export async function serveGalleryFile(req: Request, res: Response) {
  const { filename } = req.params
  const { join } = await import('path')
  const { existsSync, createReadStream, statSync } = await import('fs')
  const { env } = await import('../../config/env')
  const filePath = join(env.uploadDir, filename)

  if (!existsSync(filePath)) {
    return res.status(404).json({ status: 'error', message: 'File not found' })
  }

  const stats = statSync(filePath)
  
  // Get mimetype from filename
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  
  // Global CORS and helmet middleware handle cross-origin headers
  // Just set content headers for images
  res.setHeader('Content-Type', mimeTypes[ext || ''] || 'image/jpeg')
  res.setHeader('Content-Length', stats.size.toString())
  res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
  
  const file = createReadStream(filePath)
  file.pipe(res)
}

export async function deleteGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  await service.delete(id)
  res.json({ status: 'success', message: 'Gallery item deleted' })
}

