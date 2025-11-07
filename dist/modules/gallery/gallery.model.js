"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryModel = void 0;
exports.toGalleryItem = toGalleryItem;
const mongoose_1 = require("mongoose");
const gallerySchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    filename: {
        type: String,
        required: true,
    },
    path: {
        type: String,
        required: true,
    },
    mimetype: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    uploadedBy: {
        type: String,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
gallerySchema.index({ createdAt: -1 });
exports.GalleryModel = mongoose_1.models.Gallery ?? (0, mongoose_1.model)('Gallery', gallerySchema);
function toGalleryItem(doc, baseUrl = '') {
    const createdAt = doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString();
    const updatedAt = doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString();
    return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        filename: doc.filename,
        path: doc.path,
        imageUrl: `${baseUrl}/gallery/files/${doc.filename}`,
        mimetype: doc.mimetype,
        size: doc.size,
        uploadedBy: doc.uploadedBy,
        createdAt,
        updatedAt,
    };
}
