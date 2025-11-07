"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostReactionModel = void 0;
exports.toPostReaction = toPostReaction;
const mongoose_1 = require("mongoose");
const postReactionSchema = new mongoose_1.Schema({
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
    type: {
        type: String,
        enum: ['heart', 'wow', 'haha'],
        required: true,
    },
}, {
    timestamps: true,
});
// Unique constraint on postId + userId
postReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
exports.PostReactionModel = mongoose_1.models.PostReaction ?? (0, mongoose_1.model)('PostReaction', postReactionSchema);
function toPostReaction(doc) {
    return {
        id: doc.id,
        postId: doc.postId,
        userId: doc.userId,
        type: doc.type,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
