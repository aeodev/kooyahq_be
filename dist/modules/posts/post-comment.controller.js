"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostComment = createPostComment;
exports.getPostComments = getPostComments;
exports.updatePostComment = updatePostComment;
exports.deletePostComment = deletePostComment;
const post_comment_service_1 = require("./post-comment.service");
const notification_service_1 = require("../notifications/notification.service");
const post_service_1 = require("./post.service");
const http_error_1 = require("../../utils/http-error");
async function createPostComment(req, res, next) {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { content } = req.body;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!content || !content.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Content is required'));
    }
    try {
        const comment = await post_comment_service_1.postCommentService.create({
            postId,
            userId,
            content: content.trim(),
        });
        // Create notification for post author
        try {
            const post = await post_service_1.postService.findById(postId);
            if (post && post.authorId !== userId) {
                await notification_service_1.notificationService.createCommentNotification(post.authorId, userId, postId, comment.id);
            }
            // Create mention notifications
            if (comment.mentions.length > 0) {
                await notification_service_1.notificationService.createMentionNotification(comment.mentions, userId, postId, comment.id);
            }
        }
        catch (notifError) {
            // Don't fail the request if notification fails
            console.error('Failed to create notification:', notifError);
        }
        res.status(201).json({
            status: 'success',
            data: comment,
        });
    }
    catch (error) {
        if (error.message === 'Post not found') {
            return next((0, http_error_1.createHttpError)(404, error.message));
        }
        next(error);
    }
}
async function getPostComments(req, res, next) {
    const { postId } = req.params;
    try {
        const comments = await post_comment_service_1.postCommentService.findByPostId(postId);
        res.json({
            status: 'success',
            data: comments,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updatePostComment(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;
    const { content } = req.body;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!content || !content.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Content is required'));
    }
    try {
        const comment = await post_comment_service_1.postCommentService.update(id, userId, content.trim());
        res.json({
            status: 'success',
            data: comment,
        });
    }
    catch (error) {
        if (error.message === 'Comment not found' || error.message === 'Forbidden') {
            return next((0, http_error_1.createHttpError)(403, error.message));
        }
        next(error);
    }
}
async function deletePostComment(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const deleted = await post_comment_service_1.postCommentService.delete(id, userId);
        if (!deleted) {
            return next((0, http_error_1.createHttpError)(404, 'Comment not found or unauthorized'));
        }
        res.json({
            status: 'success',
            message: 'Comment deleted',
        });
    }
    catch (error) {
        if (error.message === 'Forbidden') {
            return next((0, http_error_1.createHttpError)(403, error.message));
        }
        next(error);
    }
}
