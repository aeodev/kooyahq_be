"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnnouncement = createAnnouncement;
exports.getAnnouncements = getAnnouncements;
exports.getAnnouncement = getAnnouncement;
exports.updateAnnouncement = updateAnnouncement;
exports.deleteAnnouncement = deleteAnnouncement;
const http_error_1 = require("../../utils/http-error");
const announcement_service_1 = require("./announcement.service");
const notification_service_1 = require("../notifications/notification.service");
async function createAnnouncement(req, res, next) {
    const userId = req.user?.id;
    const { title, content, isActive, expiresAt } = req.body;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!title || !title.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Title is required'));
    }
    if (!content || !content.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Content is required'));
    }
    let parsedExpiresAt;
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
            return next((0, http_error_1.createHttpError)(400, 'Invalid expiration date'));
        }
        if (parsed.getTime() <= Date.now()) {
            return next((0, http_error_1.createHttpError)(400, 'Expiration date must be in the future'));
        }
        parsedExpiresAt = parsed;
    }
    else if (expiresAt === null || expiresAt === '') {
        parsedExpiresAt = null;
    }
    try {
        const announcement = await announcement_service_1.announcementService.create({
            title: title.trim(),
            content: content.trim(),
            authorId: userId,
            isActive: isActive !== false,
            expiresAt: parsedExpiresAt ?? null,
        });
        // Broadcast system notification if announcement is active
        if (announcement.isActive) {
            try {
                await notification_service_1.notificationService.createSystemNotificationBroadcast(announcement.title);
            }
            catch (notifError) {
                console.error('Failed to create system notification broadcast:', notifError);
            }
        }
        res.status(201).json({
            status: 'success',
            data: announcement,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getAnnouncements(req, res, next) {
    try {
        const onlyActive = req.query.onlyActive !== 'false';
        const announcements = await announcement_service_1.announcementService.findAll(onlyActive);
        res.json({
            status: 'success',
            data: announcements,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getAnnouncement(req, res, next) {
    const id = req.params.id;
    try {
        const announcement = await announcement_service_1.announcementService.findById(id);
        if (!announcement) {
            return next((0, http_error_1.createHttpError)(404, 'Announcement not found'));
        }
        res.json({
            status: 'success',
            data: announcement,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateAnnouncement(req, res, next) {
    const id = req.params.id;
    const { title, content, isActive, expiresAt } = req.body;
    try {
        const updates = {};
        if (title !== undefined)
            updates.title = title.trim();
        if (content !== undefined)
            updates.content = content.trim();
        if (isActive !== undefined)
            updates.isActive = isActive;
        if (expiresAt !== undefined) {
            if (expiresAt === null || expiresAt === '') {
                updates.expiresAt = null;
            }
            else {
                const parsed = new Date(expiresAt);
                if (Number.isNaN(parsed.getTime())) {
                    return next((0, http_error_1.createHttpError)(400, 'Invalid expiration date'));
                }
                if (parsed.getTime() <= Date.now()) {
                    return next((0, http_error_1.createHttpError)(400, 'Expiration date must be in the future'));
                }
                updates.expiresAt = parsed;
            }
        }
        const announcement = await announcement_service_1.announcementService.update(id, updates);
        if (!announcement) {
            return next((0, http_error_1.createHttpError)(404, 'Announcement not found'));
        }
        res.json({
            status: 'success',
            data: announcement,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteAnnouncement(req, res, next) {
    const id = req.params.id;
    try {
        const deleted = await announcement_service_1.announcementService.delete(id);
        if (!deleted) {
            return next((0, http_error_1.createHttpError)(404, 'Announcement not found'));
        }
        res.json({
            status: 'success',
            message: 'Announcement deleted',
        });
    }
    catch (error) {
        next(error);
    }
}
