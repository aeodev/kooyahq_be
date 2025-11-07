"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCommentRepository = void 0;
const post_comment_model_1 = require("./post-comment.model");
exports.postCommentRepository = {
    async create(input) {
        const doc = await post_comment_model_1.PostCommentModel.create({
            postId: input.postId,
            userId: input.userId,
            content: input.content,
            mentions: input.mentions || [],
        });
        return (0, post_comment_model_1.toPostComment)(doc);
    },
    async findByPostId(postId) {
        const docs = await post_comment_model_1.PostCommentModel.find({ postId }).sort({ createdAt: 1 }).exec();
        return docs.map(post_comment_model_1.toPostComment);
    },
    async findById(id) {
        const doc = await post_comment_model_1.PostCommentModel.findById(id).exec();
        return doc ? (0, post_comment_model_1.toPostComment)(doc) : undefined;
    },
    async update(id, content, mentions) {
        const updateData = { content: content.trim() };
        if (mentions) {
            updateData.mentions = mentions;
        }
        const doc = await post_comment_model_1.PostCommentModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return doc ? (0, post_comment_model_1.toPostComment)(doc) : undefined;
    },
    async delete(id) {
        const result = await post_comment_model_1.PostCommentModel.findByIdAndDelete(id).exec();
        return !!result;
    },
    async deleteByPostId(postId) {
        const result = await post_comment_model_1.PostCommentModel.deleteMany({ postId }).exec();
        return result.deletedCount || 0;
    },
};
