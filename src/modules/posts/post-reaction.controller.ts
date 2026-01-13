import type { NextFunction, Request, Response } from 'express'
import { postReactionService } from './post-reaction.service'
import { notificationService } from '../notifications/notification.service'
import { postService } from './post.service'
import { createHttpError } from '../../utils/http-error'
import type { ReactionType } from './post-reaction.model'

export async function togglePostReaction(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { postId } = req.params
  const { type } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  const validTypes: ReactionType[] = ['heart', 'wow', 'haha']
  if (!type || !validTypes.includes(type)) {
    return next(createHttpError(400, 'Invalid reaction type'))
  }

  try {
    const reaction = await postReactionService.toggle(postId, userId, type)
    
    // Create notification for post author (only if reaction was added, not removed)
    if (reaction) {
      try {
        const post = await postService.findById(postId)
        if (post && post.authorId !== userId) {
          await notificationService.createReactionNotification(post.authorId, userId, postId, reaction.id, {
            reactionType: type,
            summary: `Reaction: ${type}`,
          })
        }
      } catch (notifError) {
        // Don't fail the request if notification fails
        console.error('Failed to create notification:', notifError)
      }
    }
    
    res.json({
      status: 'success',
      data: reaction,
    })
  } catch (error: any) {
    if (error.message === 'Post not found') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function getPostReactions(req: Request, res: Response, next: NextFunction) {
  const { postId } = req.params
  const userId = req.user?.id

  try {
    const reactions = await postReactionService.findByPostId(postId)
    const counts = await postReactionService.getReactionCounts(postId, userId)
    
    res.json({
      status: 'success',
      data: {
        reactions,
        counts,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function deletePostReaction(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const deleted = await postReactionService.delete(id, userId)
    if (!deleted) {
      return next(createHttpError(404, 'Reaction not found or unauthorized'))
    }
    res.json({
      status: 'success',
      message: 'Reaction deleted',
    })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}
