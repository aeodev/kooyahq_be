import type { NextFunction, Request, Response } from 'express'
import { postService } from './post.service'
import { notificationService } from '../notifications/notification.service'
import { extractMentions } from '../../utils/mentions'
import { createHttpError } from '../../utils/http-error'
import { resolve } from 'path'
import { existsSync, statSync } from 'fs'
import { env } from '../../config/env'

function getBaseUrl(req: Request): string {
  const protocol = req.protocol
  const host = req.get('host')
  return `${protocol}://${host}/api`
}

export async function createPost(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { content, category, tags, draft } = req.body
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || !content.trim()) {
    return next(createHttpError(400, 'Content is required'))
  }

  try {
    const baseUrl = getBaseUrl(req)
    let imageUrl: string | undefined
    
    if (file) {
      imageUrl = `${baseUrl}/posts/files/${file.filename}`
    }

    // Handle tags - could come as tags[] array or tags string from FormData
    let tagsArray: string[] = []
    const bodyTags = req.body['tags[]'] || tags
    if (bodyTags) {
      if (Array.isArray(bodyTags)) {
        tagsArray = bodyTags.map((t: string) => String(t).trim()).filter((t: string) => t)
      } else if (typeof bodyTags === 'string') {
        tagsArray = bodyTags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
      }
    }

    const post = await postService.create({
      content: content.trim(),
      authorId: userId,
      imageUrl,
      category: category?.trim(),
      tags: tagsArray,
      draft: draft === true || draft === 'true',
    })
    
    // Create notifications for mentions (only if not draft)
    if (!draft && post.id) {
      try {
        const mentions = extractMentions(post.content)
        if (mentions.length > 0) {
          // Get user IDs from usernames (simplified - would need user lookup in real implementation)
          // For now, skip mention notifications or implement user lookup
        }
      } catch (notifError) {
        console.error('Failed to create mention notifications:', notifError)
      }
    }
    
    res.status(201).json({
      status: 'success',
      data: post,
    })
  } catch (error) {
    next(error)
  }
}

export async function updatePost(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { content, category, tags, draft } = req.body
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const baseUrl = getBaseUrl(req)
    const updates: any = {}
    
    if (content !== undefined) {
      updates.content = content.trim()
    }
    if (category !== undefined) {
      updates.category = category?.trim() || undefined
    }
    if (tags !== undefined || req.body['tags[]']) {
      let tagsArray: string[] = []
      const bodyTags = req.body['tags[]'] || tags
      if (bodyTags) {
        if (Array.isArray(bodyTags)) {
          tagsArray = bodyTags.map((t: string) => String(t).trim()).filter((t: string) => t)
        } else if (typeof bodyTags === 'string') {
          tagsArray = bodyTags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        }
      }
      updates.tags = tagsArray
    }
    if (draft !== undefined) {
      updates.draft = draft === true || draft === 'true'
    }
    
    if (file) {
      updates.imageUrl = `${baseUrl}/posts/files/${file.filename}`
    }

    const post = await postService.update(id, userId, updates)
    res.json({
      status: 'success',
      data: post,
    })
  } catch (error: any) {
    if (error.message === 'Post not found' || error.message === 'Forbidden') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export function servePostFile(req: Request, res: Response, next: NextFunction) {
  const { filename } = req.params
  const filePath = resolve(env.uploadDir, filename)

  if (!existsSync(filePath)) {
    return res.status(404).json({ status: 'error', message: 'File not found' })
  }

  try {
    const stats = statSync(filePath)
    
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream'
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stats.size)
    res.sendFile(filePath)
  } catch (error) {
    return next(createHttpError(500, 'Error serving file'))
  }
}

export async function getPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const posts = await postService.findAll()
    res.json({
      status: 'success',
      data: posts,
    })
  } catch (error) {
    next(error)
  }
}

export async function getMyPosts(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { includeDrafts } = req.query

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const posts = await postService.findByAuthorId(userId, includeDrafts === 'true')
    res.json({
      status: 'success',
      data: posts,
    })
  } catch (error) {
    next(error)
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const deleted = await postService.delete(id, userId)
    if (!deleted) {
      return next(createHttpError(404, 'Post not found or unauthorized'))
    }
    res.json({
      status: 'success',
      message: 'Post deleted',
    })
  } catch (error) {
    next(error)
  }
}

