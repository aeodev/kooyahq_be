import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { uploadPost } from '../../middleware/upload-post'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { createPost, updatePost, getPosts, getMyPosts, deletePost, votePoll } from './post.controller'
import { createPostComment, getPostComments, updatePostComment, deletePostComment } from './post-comment.controller'
import { togglePostReaction, getPostReactions, deletePostReaction } from './post-reaction.controller'

export const postRouter = Router()

postRouter.use(authenticate)
postRouter.get('/', requirePermission(PERMISSIONS.POST_READ, PERMISSIONS.POST_FULL_ACCESS), getPosts)
postRouter.get('/me', requirePermission(PERMISSIONS.POST_READ, PERMISSIONS.POST_FULL_ACCESS), getMyPosts)
postRouter.post(
  '/',
  requirePermission(PERMISSIONS.POST_CREATE, PERMISSIONS.POST_FULL_ACCESS),
  uploadPost.single('image'),
  createPost
)
postRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.POST_UPDATE, PERMISSIONS.POST_FULL_ACCESS),
  uploadPost.single('image'),
  updatePost
)
postRouter.post(
  '/:id/poll/vote',
  requirePermission(PERMISSIONS.POST_POLL_VOTE, PERMISSIONS.POST_FULL_ACCESS),
  votePoll
)

// Post comments routes
postRouter.get(
  '/:postId/comments',
  requirePermission(PERMISSIONS.POST_COMMENT_READ, PERMISSIONS.POST_FULL_ACCESS),
  getPostComments
)
postRouter.post(
  '/:postId/comments',
  requirePermission(PERMISSIONS.POST_COMMENT_CREATE, PERMISSIONS.POST_FULL_ACCESS),
  createPostComment
)
postRouter.put(
  '/comments/:id',
  requirePermission(PERMISSIONS.POST_COMMENT_UPDATE, PERMISSIONS.POST_FULL_ACCESS),
  updatePostComment
)
postRouter.delete(
  '/comments/:id',
  requirePermission(PERMISSIONS.POST_COMMENT_DELETE, PERMISSIONS.POST_FULL_ACCESS),
  deletePostComment
)

// Post reactions routes
postRouter.get(
  '/:postId/reactions',
  requirePermission(PERMISSIONS.POST_READ, PERMISSIONS.POST_FULL_ACCESS),
  getPostReactions
)
postRouter.post(
  '/:postId/reactions',
  requirePermission(PERMISSIONS.POST_REACT, PERMISSIONS.POST_FULL_ACCESS),
  togglePostReaction
)
postRouter.delete(
  '/reactions/:id',
  requirePermission(PERMISSIONS.POST_REACT, PERMISSIONS.POST_FULL_ACCESS),
  deletePostReaction
)
