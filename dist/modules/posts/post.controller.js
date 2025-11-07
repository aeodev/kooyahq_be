"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPost = createPost;
exports.updatePost = updatePost;
exports.servePostFile = servePostFile;
exports.getPosts = getPosts;
exports.getMyPosts = getMyPosts;
exports.deletePost = deletePost;
const post_service_1 = require("./post.service");
const mentions_1 = require("../../utils/mentions");
const http_error_1 = require("../../utils/http-error");
const path_1 = require("path");
const fs_1 = require("fs");
const env_1 = require("../../config/env");
function getBaseUrl(req) {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api`;
}
async function createPost(req, res, next) {
    const userId = req.user?.id;
    const { content, category, tags, draft } = req.body;
    const file = req.file;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!content || !content.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Content is required'));
    }
    try {
        const baseUrl = getBaseUrl(req);
        let imageUrl;
        if (file) {
            imageUrl = `${baseUrl}/posts/files/${file.filename}`;
        }
        // Handle tags - could come as tags[] array or tags string from FormData
        let tagsArray = [];
        const bodyTags = req.body['tags[]'] || tags;
        if (bodyTags) {
            if (Array.isArray(bodyTags)) {
                tagsArray = bodyTags.map((t) => String(t).trim()).filter((t) => t);
            }
            else if (typeof bodyTags === 'string') {
                tagsArray = bodyTags.split(',').map((t) => t.trim()).filter((t) => t);
            }
        }
        const post = await post_service_1.postService.create({
            content: content.trim(),
            authorId: userId,
            imageUrl,
            category: category?.trim(),
            tags: tagsArray,
            draft: draft === true || draft === 'true',
        });
        // Create notifications for mentions (only if not draft)
        if (!draft && post.id) {
            try {
                const mentions = (0, mentions_1.extractMentions)(post.content);
                if (mentions.length > 0) {
                    // Get user IDs from usernames (simplified - would need user lookup in real implementation)
                    // For now, skip mention notifications or implement user lookup
                }
            }
            catch (notifError) {
                console.error('Failed to create mention notifications:', notifError);
            }
        }
        res.status(201).json({
            status: 'success',
            data: post,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updatePost(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;
    const { content, category, tags, draft } = req.body;
    const file = req.file;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const baseUrl = getBaseUrl(req);
        const updates = {};
        if (content !== undefined) {
            updates.content = content.trim();
        }
        if (category !== undefined) {
            updates.category = category?.trim() || undefined;
        }
        if (tags !== undefined || req.body['tags[]']) {
            let tagsArray = [];
            const bodyTags = req.body['tags[]'] || tags;
            if (bodyTags) {
                if (Array.isArray(bodyTags)) {
                    tagsArray = bodyTags.map((t) => String(t).trim()).filter((t) => t);
                }
                else if (typeof bodyTags === 'string') {
                    tagsArray = bodyTags.split(',').map((t) => t.trim()).filter((t) => t);
                }
            }
            updates.tags = tagsArray;
        }
        if (draft !== undefined) {
            updates.draft = draft === true || draft === 'true';
        }
        if (file) {
            updates.imageUrl = `${baseUrl}/posts/files/${file.filename}`;
        }
        const post = await post_service_1.postService.update(id, userId, updates);
        res.json({
            status: 'success',
            data: post,
        });
    }
    catch (error) {
        if (error.message === 'Post not found' || error.message === 'Forbidden') {
            return next((0, http_error_1.createHttpError)(403, error.message));
        }
        next(error);
    }
}
function servePostFile(req, res, next) {
    const { filename } = req.params;
    const filePath = (0, path_1.resolve)(env_1.env.uploadDir, filename);
    if (!(0, fs_1.existsSync)(filePath)) {
        return res.status(404).json({ status: 'error', message: 'File not found' });
    }
    try {
        const stats = (0, fs_1.statSync)(filePath);
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeTypes = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
        };
        const contentType = mimeTypes[ext || ''] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.sendFile(filePath);
    }
    catch (error) {
        return next((0, http_error_1.createHttpError)(500, 'Error serving file'));
    }
}
async function getPosts(req, res, next) {
    try {
        const posts = await post_service_1.postService.findAll();
        res.json({
            status: 'success',
            data: posts,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getMyPosts(req, res, next) {
    const userId = req.user?.id;
    const { includeDrafts } = req.query;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const posts = await post_service_1.postService.findByAuthorId(userId, includeDrafts === 'true');
        res.json({
            status: 'success',
            data: posts,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deletePost(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const deleted = await post_service_1.postService.delete(id, userId);
        if (!deleted) {
            return next((0, http_error_1.createHttpError)(404, 'Post not found or unauthorized'));
        }
        res.json({
            status: 'success',
            message: 'Post deleted',
        });
    }
    catch (error) {
        next(error);
    }
}
