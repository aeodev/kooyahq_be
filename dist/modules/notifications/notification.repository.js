"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const notification_model_1 = require("./notification.model");
exports.notificationRepository = {
    async create(input) {
        const doc = await notification_model_1.NotificationModel.create(input);
        return (0, notification_model_1.toNotification)(doc);
    },
    async findByUserId(userId, unreadOnly) {
        const filter = { userId };
        if (unreadOnly) {
            filter.read = false;
        }
        const docs = await notification_model_1.NotificationModel.find(filter).sort({ createdAt: -1 }).limit(100).exec();
        return docs.map(notification_model_1.toNotification);
    },
    async findById(id) {
        const doc = await notification_model_1.NotificationModel.findById(id).exec();
        return doc ? (0, notification_model_1.toNotification)(doc) : undefined;
    },
    async markAsRead(id, userId) {
        const doc = await notification_model_1.NotificationModel.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true }).exec();
        return doc ? (0, notification_model_1.toNotification)(doc) : undefined;
    },
    async markAllAsRead(userId) {
        const result = await notification_model_1.NotificationModel.updateMany({ userId, read: false }, { read: true }).exec();
        return result.modifiedCount || 0;
    },
    async getUnreadCount(userId) {
        return notification_model_1.NotificationModel.countDocuments({ userId, read: false }).exec();
    },
    async delete(id) {
        const result = await notification_model_1.NotificationModel.findByIdAndDelete(id).exec();
        return !!result;
    },
};
