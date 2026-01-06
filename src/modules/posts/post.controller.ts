import type { NextFunction, Request, Response } from 'express'
import { postService } from './post.service'
import { notificationService } from '../notifications/notification.service'
import { extractMentions } from '../../utils/mentions'
import { createHttpError } from '../../utils/http-error'
import { sanitizeHtmlContent } from '../../utils/rich-text-sanitizer'

export async function createPost(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { content, category, tags, draft } = req.body
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if ((!content || !content.trim()) && !file && !req.body.poll) {
    return next(createHttpError(400, 'Content, image, or poll is required'))
  }

  try {
    let imageUrl: string | undefined

    if (file) {
      imageUrl = (file as any).storagePath
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

    // Parse poll data if present
    let pollData
    if (req.body.poll) {
      try {
        pollData = typeof req.body.poll === 'string' ? JSON.parse(req.body.poll) : req.body.poll
        // Ensure structure
        if (pollData && (!pollData.question || !Array.isArray(pollData.options) || pollData.options.length < 2)) {
          pollData = undefined // Invalid poll data
        }
      } catch (e) {
        console.warn('Failed to parse poll data', e)
      }
    }

    const sanitizedContent = content ? sanitizeHtmlContent(String(content).trim()) : ''

    const post = await postService.create({
      content: sanitizedContent,
      authorId: userId,
      imageUrl,
      category: category?.trim(),
      tags: tagsArray,
      draft: draft === true || draft === 'true',
      poll: pollData,
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
    const updates: any = {}

    if (content !== undefined) {
      // Allow empty string updates
      updates.content = sanitizeHtmlContent(String(content))
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
      updates.imageUrl = (file as any).storagePath
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


export async function votePoll(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { optionIndex } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (typeof optionIndex !== 'number') {
    return next(createHttpError(400, 'Option index required'))
  }

  try {
    const post = await postService.vote(id, userId, optionIndex)
    res.json({
      status: 'success',
      data: post,
    })
  } catch (error) {
    next(error)
  }
}
