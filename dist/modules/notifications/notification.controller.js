"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
exports.getUnreadCount = getUnreadCount;
const notification_service_1 = require("./notification.service");
const http_error_1 = require("../../utils/http-error");
async function getNotifications(req, res, next) {
    const userId = req.user?.id;
    const { unreadOnly } = req.query;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const notifications = await notification_service_1.notificationService.findByUserId(userId, unreadOnly === 'true');
        const unreadCount = await notification_service_1.notificationService.getUnreadCount(userId);
        res.json({
            status: 'success',
            data: {
                notifications,
                unreadCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function markNotificationAsRead(req, res, next) {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const notification = await notification_service_1.notificationService.markAsRead(id, userId);
        if (!notification) {
            return next((0, http_error_1.createHttpError)(404, 'Notification not found'));
        }
        res.json({
            status: 'success',
            data: notification,
        });
    }
    catch (error) {
        next(error);
    }
}
async function markAllNotificationsAsRead(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const count = await notification_service_1.notificationService.markAllAsRead(userId);
        res.json({
            status: 'success',
            data: { count },
        });
    }
    catch (error) {
        next(error);
    }
}
async function getUnreadCount(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const count = await notification_service_1.notificationService.getUnreadCount(userId);
        res.json({
            status: 'success',
            data: { count },
        });
    }
    catch (error) {
        next(error);
    }
}
