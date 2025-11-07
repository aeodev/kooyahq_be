"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
exports.toNotification = toNotification;
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['post_created', 'comment', 'reaction', 'mention', 'system', 'card_assigned', 'card_comment', 'board_member_added'],
        required: true,
    },
    postId: {
        type: String,
        index: true,
    },
    commentId: {
        type: String,
    },
    reactionId: {
        type: String,
    },
    mentionId: {
        type: String,
    },
    cardId: {
        type: String,
        index: true,
    },
    boardId: {
        type: String,
        index: true,
    },
    title: {
        type: String,
    },
    read: {
        type: Boolean,
        default: false,
        index: true,
    },
}, {
    timestamps: true,
});
exports.NotificationModel = mongoose_1.models.Notification ?? (0, mongoose_1.model)('Notification', notificationSchema);
function toNotification(doc) {
    return {
        id: doc.id,
        userId: doc.userId,
        type: doc.type,
        postId: doc.postId,
        commentId: doc.commentId,
        reactionId: doc.reactionId,
        mentionId: doc.mentionId,
        cardId: doc.cardId,
        boardId: doc.boardId,
        title: doc.title,
        read: doc.read ?? false,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
