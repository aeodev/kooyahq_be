"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCommentService = void 0;
const post_comment_repository_1 = require("./post-comment.repository");
const post_repository_1 = require("./post.repository");
const mentions_1 = require("../../utils/mentions");
const user_service_1 = require("../users/user.service");
exports.postCommentService = {
    async create(input) {
        const post = await post_repository_1.postRepository.findById(input.postId);
        if (!post) {
            throw new Error('Post not found');
        }
        const mentions = (0, mentions_1.extractMentions)(input.content);
        const comment = await post_comment_repository_1.postCommentRepository.create({
            ...input,
            mentions,
        });
        const author = await user_service_1.userService.getPublicProfile(input.userId);
        if (!author) {
            throw new Error('Author not found');
        }
        return {
            ...comment,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        };
    },
    async findByPostId(postId) {
        const comments = await post_comment_repository_1.postCommentRepository.findByPostId(postId);
        const userIds = [...new Set(comments.map((c) => c.userId))];
        const authors = await Promise.all(userIds.map(async (id) => {
            const author = await user_service_1.userService.getPublicProfile(id);
            return { id, author };
        }));
        const authorMap = new Map(authors.filter((a) => a.author).map((a) => [a.id, a.author]));
        return comments.map((comment) => {
            const author = authorMap.get(comment.userId);
            return {
                ...comment,
                author: {
                    id: author.id,
                    name: author.name,
                    email: author.email,
                    profilePic: author.profilePic,
                },
            };
        });
    },
    async findById(id) {
        const comment = await post_comment_repository_1.postCommentRepository.findById(id);
        if (!comment) {
            return undefined;
        }
        const author = await user_service_1.userService.getPublicProfile(comment.userId);
        if (!author) {
            return undefined;
        }
        return {
            ...comment,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        };
    },
    async update(id, userId, content) {
        const comment = await post_comment_repository_1.postCommentRepository.findById(id);
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (comment.userId !== userId) {
            throw new Error('Forbidden');
        }
        const mentions = (0, mentions_1.extractMentions)(content);
        const updated = await post_comment_repository_1.postCommentRepository.update(id, content, mentions);
        if (!updated) {
            throw new Error('Failed to update comment');
        }
        const author = await user_service_1.userService.getPublicProfile(userId);
        if (!author) {
            throw new Error('Author not found');
        }
        return {
            ...updated,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        };
    },
    async delete(id, userId) {
        const comment = await post_comment_repository_1.postCommentRepository.findById(id);
        if (!comment) {
            return false;
        }
        if (comment.userId !== userId) {
            throw new Error('Forbidden');
        }
        return post_comment_repository_1.postCommentRepository.delete(id);
    },
};
