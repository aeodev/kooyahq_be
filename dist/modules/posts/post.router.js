"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const upload_post_1 = require("../../middleware/upload-post");
const post_controller_1 = require("./post.controller");
const post_comment_controller_1 = require("./post-comment.controller");
const post_reaction_controller_1 = require("./post-reaction.controller");
exports.postRouter = (0, express_1.Router)();
exports.postRouter.use(authenticate_1.authenticate);
exports.postRouter.get('/', post_controller_1.getPosts);
exports.postRouter.get('/me', post_controller_1.getMyPosts);
exports.postRouter.post('/', upload_post_1.uploadPost.single('image'), post_controller_1.createPost);
exports.postRouter.put('/:id', upload_post_1.uploadPost.single('image'), post_controller_1.updatePost);
exports.postRouter.delete('/:id', post_controller_1.deletePost);
// Post comments routes
exports.postRouter.get('/:postId/comments', post_comment_controller_1.getPostComments);
exports.postRouter.post('/:postId/comments', post_comment_controller_1.createPostComment);
exports.postRouter.put('/comments/:id', post_comment_controller_1.updatePostComment);
exports.postRouter.delete('/comments/:id', post_comment_controller_1.deletePostComment);
// Post reactions routes
exports.postRouter.get('/:postId/reactions', post_reaction_controller_1.getPostReactions);
exports.postRouter.post('/:postId/reactions', post_reaction_controller_1.togglePostReaction);
exports.postRouter.delete('/reactions/:id', post_reaction_controller_1.deletePostReaction);
