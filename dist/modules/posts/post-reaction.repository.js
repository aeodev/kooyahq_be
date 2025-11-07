"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReactionRepository = void 0;
const post_reaction_model_1 = require("./post-reaction.model");
exports.postReactionRepository = {
    async create(input) {
        const doc = await post_reaction_model_1.PostReactionModel.create(input);
        return (0, post_reaction_model_1.toPostReaction)(doc);
    },
    async findByPostId(postId) {
        const docs = await post_reaction_model_1.PostReactionModel.find({ postId }).sort({ createdAt: -1 }).exec();
        return docs.map(post_reaction_model_1.toPostReaction);
    },
    async findByPostIdAndUserId(postId, userId) {
        const doc = await post_reaction_model_1.PostReactionModel.findOne({ postId, userId }).exec();
        return doc ? (0, post_reaction_model_1.toPostReaction)(doc) : undefined;
    },
    async findById(id) {
        const doc = await post_reaction_model_1.PostReactionModel.findById(id).exec();
        return doc ? (0, post_reaction_model_1.toPostReaction)(doc) : undefined;
    },
    async update(id, type) {
        const doc = await post_reaction_model_1.PostReactionModel.findByIdAndUpdate(id, { type }, { new: true }).exec();
        return doc ? (0, post_reaction_model_1.toPostReaction)(doc) : undefined;
    },
    async toggle(postId, userId, type) {
        const existing = await this.findByPostIdAndUserId(postId, userId);
        if (existing) {
            if (existing.type === type) {
                // Same reaction type, remove it
                await post_reaction_model_1.PostReactionModel.findByIdAndDelete(existing.id).exec();
                return null;
            }
            else {
                // Different reaction type, update it
                const updated = await this.update(existing.id, type);
                return updated || null;
            }
        }
        else {
            // No existing reaction, create new
            return await this.create({ postId, userId, type });
        }
    },
    async delete(id) {
        const result = await post_reaction_model_1.PostReactionModel.findByIdAndDelete(id).exec();
        return !!result;
    },
    async deleteByPostId(postId) {
        const result = await post_reaction_model_1.PostReactionModel.deleteMany({ postId }).exec();
        return result.deletedCount || 0;
    },
    async getReactionCounts(postId) {
        const reactions = await post_reaction_model_1.PostReactionModel.find({ postId }).exec();
        const counts = {
            heart: 0,
            wow: 0,
            haha: 0,
        };
        reactions.forEach((reaction) => {
            counts[reaction.type] = (counts[reaction.type] || 0) + 1;
        });
        return counts;
    },
};
