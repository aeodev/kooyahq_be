import type { NextFunction, Request, Response } from 'express'
import { postCommentService } from './post-comment.service'
import { notificationService } from '../notifications/notification.service'
import { postService } from './post.service'
import { createHttpError } from '../../utils/http-error'
import { sanitizeHtmlContent } from '../../utils/rich-text-sanitizer'
import { cleanHtml } from '../../utils/text.utils'

export async function createPostComment(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { postId } = req.params
  const { content } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || !content.trim()) {
    return next(createHttpError(400, 'Content is required'))
  }

  try {
    const sanitizedContent = sanitizeHtmlContent(content.trim())
    const commentPreview = cleanHtml(sanitizedContent).slice(0, 160)
    const comment = await postCommentService.create({
      postId,
      userId,
      content: sanitizedContent,
    })
    
    // Create notification for post author
    try {
      const post = await postService.findById(postId)
      if (post && post.authorId !== userId) {
        await notificationService.createCommentNotification(post.authorId, userId, postId, comment.id, {
          summary: commentPreview,
          commentPreview,
        })
      }
      
      // Create mention notifications
      if (comment.mentions.length > 0) {
        await notificationService.createMentionNotification(comment.mentions, userId, postId, comment.id, {
          summary: commentPreview,
          commentPreview,
        })
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('Failed to create notification:', notifError)
    }
    
    res.status(201).json({
      status: 'success',
      data: comment,
    })
  } catch (error: any) {
    if (error.message === 'Post not found') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function getPostComments(req: Request, res: Response, next: NextFunction) {
  const { postId } = req.params

  try {
    const comments = await postCommentService.findByPostId(postId)
    res.json({
      status: 'success',
      data: comments,
    })
  } catch (error) {
    next(error)
  }
}

export async function updatePostComment(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { content } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || !content.trim()) {
    return next(createHttpError(400, 'Content is required'))
  }

  try {
    const comment = await postCommentService.update(id, userId, sanitizeHtmlContent(content.trim()))
    res.json({
      status: 'success',
      data: comment,
    })
  } catch (error: any) {
    if (error.message === 'Comment not found' || error.message === 'Forbidden') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function deletePostComment(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const deleted = await postCommentService.delete(id, userId)
    if (!deleted) {
      return next(createHttpError(404, 'Comment not found or unauthorized'))
    }
    res.json({
      status: 'success',
      message: 'Comment deleted',
    })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}
