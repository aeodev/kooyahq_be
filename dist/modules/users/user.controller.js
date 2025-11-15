"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveProfileFile = serveProfileFile;
exports.getUserById = getUserById;
exports.getAllUsers = getAllUsers;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.updateEmployee = updateEmployee;
const user_service_1 = require("./user.service");
const http_error_1 = require("../../utils/http-error");
const path_1 = require("path");
const fs_1 = require("fs");
const env_1 = require("../../config/env");
function getBaseUrl(req) {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api`;
}
function serveProfileFile(req, res, next) {
    const { filename } = req.params;
    const filePath = (0, path_1.resolve)(env_1.env.uploadDir, filename);
    if (!(0, fs_1.existsSync)(filePath)) {
        return res.status(404).json({ status: 'error', message: 'File not found' });
    }
    try {
        const stats = (0, fs_1.statSync)(filePath);
        // Get mimetype from filename
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
async function getUserById(req, res, next) {
    const { id } = req.params;
    try {
        const user = await user_service_1.userService.getPublicProfile(id);
        if (!user) {
            return next((0, http_error_1.createHttpError)(404, 'User not found'));
        }
        res.json({
            status: 'success',
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getAllUsers(req, res, next) {
    try {
        const users = await user_service_1.userService.findAll();
        res.json({
            status: 'success',
            data: users,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getProfile(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const user = await user_service_1.userService.getPublicProfile(userId);
        if (!user) {
            return next((0, http_error_1.createHttpError)(404, 'User not found'));
        }
        res.json({
            status: 'success',
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateProfile(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const updates = {};
        const files = req.files;
        const { bio } = req.body;
        const profilePicFiles = files?.['profilePic'];
        const bannerFiles = files?.['banner'];
        const profilePicFile = profilePicFiles && profilePicFiles.length > 0 ? profilePicFiles[0] : undefined;
        const bannerFile = bannerFiles && bannerFiles.length > 0 ? bannerFiles[0] : undefined;
        if (profilePicFile && profilePicFile.filename) {
            const baseUrl = getBaseUrl(req);
            updates.profilePic = `${baseUrl}/users/files/${profilePicFile.filename}`;
        }
        if (bannerFile && bannerFile.filename) {
            const baseUrl = getBaseUrl(req);
            updates.banner = `${baseUrl}/users/files/${bannerFile.filename}`;
        }
        if (bio !== undefined) {
            updates.bio = bio?.trim() || undefined;
        }
        // Only update if there are actual changes
        if (Object.keys(updates).length === 0) {
            return next((0, http_error_1.createHttpError)(400, 'No updates provided'));
        }
        const updated = await user_service_1.userService.updateProfile(userId, updates);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'User not found'));
        }
        res.json({
            status: 'success',
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateEmployee(req, res, next) {
    const { id } = req.params;
    const { name, email, position, birthday, isAdmin } = req.body;
    try {
        const updates = {};
        if (name !== undefined) {
            if (!name.trim()) {
                return next((0, http_error_1.createHttpError)(400, 'Name cannot be empty'));
            }
            updates.name = name.trim();
        }
        if (email !== undefined) {
            if (!email.trim()) {
                return next((0, http_error_1.createHttpError)(400, 'Email cannot be empty'));
            }
            updates.email = email.trim();
        }
        if (position !== undefined) {
            updates.position = position.trim() || undefined;
        }
        if (birthday !== undefined) {
            updates.birthday = birthday?.trim() || undefined;
        }
        if (isAdmin !== undefined) {
            updates.isAdmin = Boolean(isAdmin);
        }
        if (Object.keys(updates).length === 0) {
            return next((0, http_error_1.createHttpError)(400, 'No updates provided'));
        }
        const updated = await user_service_1.userService.updateEmployee(id, updates);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'User not found'));
        }
        res.json({
            status: 'success',
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
}
