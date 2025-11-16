import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { uploadPost } from '../../middleware/upload-post'
import { createPost, updatePost, getPosts, getMyPosts, deletePost } from './post.controller'
import { createPostComment, getPostComments, updatePostComment, deletePostComment } from './post-comment.controller'
import { togglePostReaction, getPostReactions, deletePostReaction } from './post-reaction.controller'

export const postRouter = Router()

postRouter.use(authenticate)
postRouter.get('/', getPosts)
postRouter.get('/me', getMyPosts)
postRouter.post('/', uploadPost.single('image'), createPost)
postRouter.put('/:id', uploadPost.single('image'), updatePost)
postRouter.delete('/:id', deletePost)

// Post comments routes
postRouter.get('/:postId/comments', getPostComments)
postRouter.post('/:postId/comments', createPostComment)
postRouter.put('/comments/:id', updatePostComment)
postRouter.delete('/comments/:id', deletePostComment)

// Post reactions routes
postRouter.get('/:postId/reactions', getPostReactions)
postRouter.post('/:postId/reactions', togglePostReaction)
postRouter.delete('/reactions/:id', deletePostReaction)

