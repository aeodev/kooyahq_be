"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
exports.toComment = toComment;
const mongoose_1 = require("mongoose");
const commentSchema = new mongoose_1.Schema({
    cardId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
}, {
    timestamps: true,
});
exports.CommentModel = mongoose_1.models.Comment ?? (0, mongoose_1.model)('Comment', commentSchema);
function toComment(doc) {
    return {
        id: doc.id,
        cardId: doc.cardId,
        userId: doc.userId,
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
