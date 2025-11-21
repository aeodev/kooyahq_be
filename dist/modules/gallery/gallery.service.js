"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryService = void 0;
const gallery_repository_1 = require("./gallery.repository");
const http_error_1 = require("../../utils/http-error");
const gallery_model_1 = require("./gallery.model");
const cloudinary_1 = require("../../utils/cloudinary");
class GalleryService {
    galleryRepo = new gallery_repository_1.GalleryRepository();
    async create(userId, input, baseUrl = '') {
        const item = await this.galleryRepo.create({
            ...input,
            uploadedBy: userId,
        });
        return (0, gallery_model_1.toGalleryItem)(item, baseUrl);
    }
    async findAll(baseUrl = '') {
        const items = await this.galleryRepo.findAll();
        return items.map(item => (0, gallery_model_1.toGalleryItem)(item, baseUrl));
    }
    async findById(id, baseUrl = '') {
        const item = await this.galleryRepo.findById(id);
        if (!item) {
            throw new http_error_1.HttpError(404, 'Gallery item not found');
        }
        return (0, gallery_model_1.toGalleryItem)(item, baseUrl);
    }
    async update(id, updates, baseUrl = '') {
        const item = await this.galleryRepo.update(id, updates);
        return (0, gallery_model_1.toGalleryItem)(item, baseUrl);
    }
    async delete(id) {
        const item = await this.galleryRepo.findById(id);
        if (item) {
            // Delete from Cloudinary if it's a Cloudinary URL
            if (item.path && item.path.startsWith('http')) {
                try {
                    const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(item.path) || item.filename;
                    if (publicId) {
                        await (0, cloudinary_1.deleteFromCloudinary)(publicId);
                    }
                }
                catch (error) {
                    // File might already be deleted, continue anyway
                    console.warn('Failed to delete from Cloudinary:', error);
                }
            }
        }
        await this.galleryRepo.delete(id);
    }
}
exports.GalleryService = GalleryService;
