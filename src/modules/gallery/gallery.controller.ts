import { Request, Response } from 'express'
import { GalleryService } from './gallery.service'
import type { CreateGalleryInput, UpdateGalleryInput } from './gallery.repository'
import { hasPermission } from '../auth/rbac/permissions'
import { PERMISSIONS } from '../auth/rbac/permissions'

const service = new GalleryService()

export async function createGalleryItem(req: Request, res: Response) {
  const userId = req.user!.id
  const file = req.file

  if (!file) {
    return res.status(400).json({ status: 'error', message: 'Image file is required' })
  }

  const title = req.body.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '')
  const description = req.body.description?.trim()

  const cloudinaryUrl = (file as any).cloudinaryUrl || ''
  const cloudinaryPublicId = (file as any).cloudinaryPublicId || ''

  const input: CreateGalleryInput = {
    title,
    description,
    filename: cloudinaryPublicId || file.originalname,
    path: cloudinaryUrl,
    mimetype: file.mimetype,
    size: file.size,
    uploadedBy: userId,
  }

  const item = await service.create(userId, input, '')
  res.status(201).json({ status: 'success', data: item })
}

export async function createMultipleGalleryItems(req: Request, res: Response) {
  const userId = req.user!.id
  const files = Array.isArray(req.files) ? req.files : []

  if (!files || files.length === 0) {
    return res.status(400).json({ status: 'error', message: 'At least one image file is required' })
  }

  const items: CreateGalleryInput[] = []

  files.forEach((file, index) => {
    // Try to get per-image title/description by index, fallback to generic or filename
    const title = req.body[`title-${index}`]?.trim() 
      || req.body[`title-${file.fieldname}`]?.trim() 
      || file.originalname.replace(/\.[^/.]+$/, '')
    const description = req.body[`description-${index}`]?.trim() 
      || req.body[`description-${file.fieldname}`]?.trim()

    const cloudinaryUrl = (file as any).cloudinaryUrl || ''
    const cloudinaryPublicId = (file as any).cloudinaryPublicId || ''

    const input: CreateGalleryInput = {
      title,
      description,
      filename: cloudinaryPublicId || file.originalname,
      path: cloudinaryUrl,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: userId,
    }

    items.push(input)
  })

  // Create all items
  const createdItems = await Promise.all(
    items.map((input) => service.create(userId, input, ''))
  )

  res.status(201).json({ status: 'success', data: createdItems })
}

export async function getGalleryItems(req: Request, res: Response) {
  const { page, limit, search, sort } = req.query
  const user = req.user!

  // Check if user can approve
  const canApprove = hasPermission(user, PERMISSIONS.GALLERY_APPROVE) || 
                     hasPermission(user, PERMISSIONS.GALLERY_FULL_ACCESS)

  // If pagination/search params provided, use search
  if (page || limit || search || sort) {
    const statusFilter = canApprove ? undefined : 'approved'
    const result = await service.search({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string | undefined,
      sort: sort as string | undefined,
      status: statusFilter,
    }, '')

    res.json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    })
  } else {
    // Otherwise, return all items (filtered by status for regular users)
    const statusFilter = canApprove ? undefined : 'approved'
    const items = await service.findAll('', statusFilter)
    res.json({ status: 'success', data: items })
  }
}

export async function getGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  const item = await service.findById(id, '')
  res.json({ status: 'success', data: item })
}

export async function updateGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  const updates: UpdateGalleryInput = {
    title: req.body.title?.trim(),
    description: req.body.description?.trim(),
  }
  const item = await service.update(id, updates, '')
  res.json({ status: 'success', data: item })
}

export async function deleteGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  await service.delete(id)
  res.json({ status: 'success', message: 'Gallery item deleted' })
}

export async function deleteMultipleGalleryItems(req: Request, res: Response) {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ status: 'error', message: 'ids array is required' })
  }
  await Promise.all(ids.map((id: string) => service.delete(id)))
  res.json({ status: 'success', message: 'Gallery items deleted' })
}

export async function approveGalleryItem(req: Request, res: Response) {
  const { id } = req.params
  const userId = req.user!.id
  const item = await service.approve(id, userId, '')
  res.json({ status: 'success', data: item })
}

