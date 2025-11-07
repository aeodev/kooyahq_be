"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComment = createComment;
exports.getCommentsByCard = getCommentsByCard;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
const comment_service_1 = require("./comment.service");
const card_service_1 = require("./card.service");
const board_service_1 = require("../boards/board.service");
const notification_service_1 = require("../notifications/notification.service");
const http_error_1 = require("../../utils/http-error");
async function createComment(req, res, next) {
    const { cardId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return next((0, http_error_1.createHttpError)(400, 'Comment content is required'));
    }
    try {
        const comment = await comment_service_1.commentService.create(cardId, userId, content.trim());
        // Create notifications for card assignee and board owner
        try {
            const card = await card_service_1.cardService.findById(cardId);
            if (card) {
                const board = await board_service_1.boardService.findById(card.boardId);
                await notification_service_1.notificationService.createCardCommentNotification(cardId, userId, comment.id, card.assigneeId, board?.ownerId);
            }
        }
        catch (notifError) {
            console.error('Failed to create card comment notification:', notifError);
        }
        res.status(201).json({
            status: 'success',
            data: comment,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getCommentsByCard(req, res, next) {
    const { cardId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const comments = await comment_service_1.commentService.findByCardId(cardId);
        res.json({
            status: 'success',
            data: comments,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateComment(req, res, next) {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return next((0, http_error_1.createHttpError)(400, 'Comment content is required'));
    }
    try {
        const updated = await comment_service_1.commentService.update(id, userId, content.trim());
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Comment not found'));
        }
        res.json({
            status: 'success',
            data: updated,
        });
    }
    catch (error) {
        if (error.message === 'Forbidden') {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        next(error);
    }
}
async function deleteComment(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        await comment_service_1.commentService.delete(id, userId);
        res.json({
            status: 'success',
            message: 'Comment deleted',
        });
    }
    catch (error) {
        if (error.message === 'Forbidden') {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        next(error);
    }
}
