"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRepository = void 0;
const post_model_1 = require("./post.model");
exports.postRepository = {
    async create(input) {
        const doc = await post_model_1.PostModel.create({
            content: input.content,
            authorId: input.authorId,
            imageUrl: input.imageUrl,
            category: input.category,
            tags: input.tags || [],
            draft: input.draft ?? false,
        });
        return (0, post_model_1.toPost)(doc);
    },
    async update(id, updates) {
        const updateData = { ...updates };
        if (updates.content) {
            updateData.editedAt = new Date();
        }
        const doc = await post_model_1.PostModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return doc ? (0, post_model_1.toPost)(doc) : undefined;
    },
    async findAll() {
        const docs = await post_model_1.PostModel.find({ draft: false }).sort({ createdAt: -1 }).limit(100).exec();
        return docs.map(post_model_1.toPost);
    },
    async findByAuthorId(authorId, includeDrafts) {
        const filter = { authorId };
        if (!includeDrafts) {
            filter.draft = false;
        }
        const docs = await post_model_1.PostModel.find(filter).sort({ createdAt: -1 }).limit(100).exec();
        return docs.map(post_model_1.toPost);
    },
    async findById(id) {
        const doc = await post_model_1.PostModel.findById(id).exec();
        return doc ? (0, post_model_1.toPost)(doc) : undefined;
    },
    async delete(id, authorId) {
        const result = await post_model_1.PostModel.deleteOne({ _id: id, authorId }).exec();
        return result.deletedCount > 0;
    },
};
