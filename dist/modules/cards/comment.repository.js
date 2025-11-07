"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRepository = void 0;
const comment_model_1 = require("./comment.model");
exports.commentRepository = {
    async create(input) {
        const doc = await comment_model_1.CommentModel.create(input);
        return (0, comment_model_1.toComment)(doc);
    },
    async findByCardId(cardId) {
        const docs = await comment_model_1.CommentModel.find({ cardId }).sort({ createdAt: 1 }).exec();
        return docs.map((doc) => (0, comment_model_1.toComment)(doc));
    },
    async findById(id) {
        const doc = await comment_model_1.CommentModel.findById(id).exec();
        return doc ? (0, comment_model_1.toComment)(doc) : undefined;
    },
    async update(id, content) {
        const doc = await comment_model_1.CommentModel.findByIdAndUpdate(id, { content: content.trim() }, { new: true }).exec();
        return doc ? (0, comment_model_1.toComment)(doc) : undefined;
    },
    async delete(id) {
        const result = await comment_model_1.CommentModel.findByIdAndDelete(id).exec();
        return !!result;
    },
};
