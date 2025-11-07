"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReactionService = void 0;
const post_reaction_repository_1 = require("./post-reaction.repository");
const post_repository_1 = require("./post.repository");
const user_service_1 = require("../users/user.service");
exports.postReactionService = {
    async toggle(postId, userId, type) {
        const post = await post_repository_1.postRepository.findById(postId);
        if (!post) {
            throw new Error('Post not found');
        }
        const reaction = await post_reaction_repository_1.postReactionRepository.toggle(postId, userId, type);
        if (!reaction) {
            return null;
        }
        const author = await user_service_1.userService.getPublicProfile(userId);
        if (!author) {
            throw new Error('Author not found');
        }
        return {
            ...reaction,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        };
    },
    async findByPostId(postId) {
        const reactions = await post_reaction_repository_1.postReactionRepository.findByPostId(postId);
        const userIds = [...new Set(reactions.map((r) => r.userId))];
        const authors = await Promise.all(userIds.map(async (id) => {
            const author = await user_service_1.userService.getPublicProfile(id);
            return { id, author };
        }));
        const authorMap = new Map(authors.filter((a) => a.author).map((a) => [a.id, a.author]));
        return reactions.map((reaction) => {
            const author = authorMap.get(reaction.userId);
            return {
                ...reaction,
                author: {
                    id: author.id,
                    name: author.name,
                    email: author.email,
                    profilePic: author.profilePic,
                },
            };
        });
    },
    async getReactionCounts(postId, userId) {
        const counts = await post_reaction_repository_1.postReactionRepository.getReactionCounts(postId);
        let userReaction;
        if (userId) {
            const userReactionDoc = await post_reaction_repository_1.postReactionRepository.findByPostIdAndUserId(postId, userId);
            userReaction = userReactionDoc?.type;
        }
        return {
            ...counts,
            userReaction,
        };
    },
    async delete(id, userId) {
        const reaction = await post_reaction_repository_1.postReactionRepository.findById(id);
        if (!reaction) {
            return false;
        }
        if (reaction.userId !== userId) {
            throw new Error('Forbidden');
        }
        return post_reaction_repository_1.postReactionRepository.delete(id);
    },
};
