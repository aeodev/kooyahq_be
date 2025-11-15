"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementModel = void 0;
exports.toAnnouncement = toAnnouncement;
const mongoose_1 = require("mongoose");
const announcementSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    authorId: {
        type: String,
        required: true,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        default: null,
        index: true,
    },
}, {
    timestamps: true,
});
exports.AnnouncementModel = mongoose_1.models.Announcement ?? (0, mongoose_1.model)('Announcement', announcementSchema);
function toAnnouncement(doc) {
    return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        authorId: doc.authorId,
        isActive: doc.isActive,
        expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
