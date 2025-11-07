"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostCommentModel = void 0;
exports.toPostComment = toPostComment;
const mongoose_1 = require("mongoose");
const postCommentSchema = new mongoose_1.Schema({
    postId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    mentions: {
        type: [String],
        default: [],
    },
}, {
    timestamps: true,
});
exports.PostCommentModel = mongoose_1.models.PostComment ?? (0, mongoose_1.model)('PostComment', postCommentSchema);
function toPostComment(doc) {
    return {
        id: doc.id,
        postId: doc.postId,
        userId: doc.userId,
        content: doc.content,
        mentions: doc.mentions || [],
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
