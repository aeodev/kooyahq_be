"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostModel = void 0;
exports.toPost = toPost;
const mongoose_1 = require("mongoose");
const postSchema = new mongoose_1.Schema({
    content: {
        type: String,
        required: true,
    },
    authorId: {
        type: String,
        required: true,
        index: true,
    },
    imageUrl: {
        type: String,
    },
    category: {
        type: String,
    },
    tags: {
        type: [String],
        default: [],
    },
    draft: {
        type: Boolean,
        default: false,
    },
    editedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.PostModel = mongoose_1.models.Post ?? (0, mongoose_1.model)('Post', postSchema);
function toPost(doc) {
    return {
        id: doc.id,
        content: doc.content,
        authorId: doc.authorId,
        imageUrl: doc.imageUrl,
        category: doc.category,
        tags: doc.tags || [],
        draft: doc.draft ?? false,
        editedAt: doc.editedAt?.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
