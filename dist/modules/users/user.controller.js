"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getAllUsers = getAllUsers;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.updateEmployee = updateEmployee;
const user_service_1 = require("./user.service");
const http_error_1 = require("../../utils/http-error");
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
        if (profilePicFile && profilePicFile.cloudinaryUrl) {
            updates.profilePic = profilePicFile.cloudinaryUrl;
        }
        if (bannerFile && bannerFile.cloudinaryUrl) {
            updates.banner = bannerFile.cloudinaryUrl;
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
