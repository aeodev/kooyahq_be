"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = void 0;
const post_repository_1 = require("./post.repository");
const user_service_1 = require("../users/user.service");
exports.postService = {
    async create(input) {
        const post = await post_repository_1.postRepository.create(input);
        const author = await user_service_1.userService.getPublicProfile(input.authorId);
        if (!author) {
            throw new Error('Author not found');
        }
        return {
            ...post,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        };
    },
    async update(id, authorId, updates) {
        const post = await post_repository_1.postRepository.findById(id);
        if (!post) {
            throw new Error('Post not found');
        }
        if (post.authorId !== authorId) {
            throw new Error('Forbidden');
        }
        const updated = await post_repository_1.postRepository.update(id, updates);
        if (!updated) {
            throw new Error('Failed to update post');
        }
        const author = await user_service_1.userService.getPublicProfile(authorId);
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
    async findById(id) {
        const post = await post_repository_1.postRepository.findById(id);
        if (!post) {
            return undefined;
        }
        const author = await user_service_1.userService.getPublicProfile(post.authorId);
        if (!author) {
            return undefined;
        }
        return {
            ...post,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        };
    },
    async findAll() {
        const posts = await post_repository_1.postRepository.findAll();
        const authorIds = [...new Set(posts.map((p) => p.authorId))];
        const authors = await Promise.all(authorIds.map(async (id) => {
            const author = await user_service_1.userService.getPublicProfile(id);
            return { id, author };
        }));
        const authorMap = new Map(authors.filter((a) => a.author).map((a) => [a.id, a.author]));
        return posts.map((post) => {
            const author = authorMap.get(post.authorId);
            return {
                ...post,
                author: {
                    id: author.id,
                    name: author.name,
                    email: author.email,
                    profilePic: author.profilePic,
                },
            };
        });
    },
    async findByAuthorId(authorId, includeDrafts) {
        const posts = await post_repository_1.postRepository.findByAuthorId(authorId, includeDrafts);
        const author = await user_service_1.userService.getPublicProfile(authorId);
        if (!author) {
            return [];
        }
        return posts.map((post) => ({
            ...post,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
                profilePic: author.profilePic,
            },
        }));
    },
    async delete(id, authorId) {
        return post_repository_1.postRepository.delete(id, authorId);
    },
};
