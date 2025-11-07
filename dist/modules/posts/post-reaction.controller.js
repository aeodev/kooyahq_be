"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePostReaction = togglePostReaction;
exports.getPostReactions = getPostReactions;
exports.deletePostReaction = deletePostReaction;
const post_reaction_service_1 = require("./post-reaction.service");
const notification_service_1 = require("../notifications/notification.service");
const post_service_1 = require("./post.service");
const http_error_1 = require("../../utils/http-error");
async function togglePostReaction(req, res, next) {
    const userId = req.user?.id;
    const { postId } = req.params;
    const { type } = req.body;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    const validTypes = ['heart', 'wow', 'haha'];
    if (!type || !validTypes.includes(type)) {
        return next((0, http_error_1.createHttpError)(400, 'Invalid reaction type'));
    }
    try {
        const reaction = await post_reaction_service_1.postReactionService.toggle(postId, userId, type);
        // Create notification for post author (only if reaction was added, not removed)
        if (reaction) {
            try {
                const post = await post_service_1.postService.findById(postId);
                if (post && post.authorId !== userId) {
                    await notification_service_1.notificationService.createReactionNotification(post.authorId, userId, postId, reaction.id);
                }
            }
            catch (notifError) {
                // Don't fail the request if notification fails
                console.error('Failed to create notification:', notifError);
            }
        }
        res.json({
            status: 'success',
            data: reaction,
        });
    }
    catch (error) {
        if (error.message === 'Post not found') {
            return next((0, http_error_1.createHttpError)(404, error.message));
        }
        next(error);
    }
}
async function getPostReactions(req, res, next) {
    const { postId } = req.params;
    const userId = req.user?.id;
    try {
        const reactions = await post_reaction_service_1.postReactionService.findByPostId(postId);
        const counts = await post_reaction_service_1.postReactionService.getReactionCounts(postId, userId);
        res.json({
            status: 'success',
            data: {
                reactions,
                counts,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function deletePostReaction(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const deleted = await post_reaction_service_1.postReactionService.delete(id, userId);
        if (!deleted) {
            return next((0, http_error_1.createHttpError)(404, 'Reaction not found or unauthorized'));
        }
        res.json({
            status: 'success',
            message: 'Reaction deleted',
        });
    }
    catch (error) {
        if (error.message === 'Forbidden') {
            return next((0, http_error_1.createHttpError)(403, error.message));
        }
        next(error);
    }
}
