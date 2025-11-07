"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryRepository = void 0;
const gallery_model_1 = require("./gallery.model");
class GalleryRepository {
    async create(input) {
        const doc = new gallery_model_1.GalleryModel(input);
        await doc.save();
        return (0, gallery_model_1.toGalleryItem)(doc);
    }
    async findById(id) {
        const doc = await gallery_model_1.GalleryModel.findById(id);
        return doc ? (0, gallery_model_1.toGalleryItem)(doc) : undefined;
    }
    async findAll() {
        const docs = await gallery_model_1.GalleryModel.find().sort({ createdAt: -1 });
        return docs.map((doc) => (0, gallery_model_1.toGalleryItem)(doc, ''));
    }
    async update(id, updates) {
        const doc = await gallery_model_1.GalleryModel.findByIdAndUpdate(id, updates, { new: true });
        if (!doc) {
            throw new Error('Gallery item not found');
        }
        return (0, gallery_model_1.toGalleryItem)(doc, '');
    }
    async delete(id) {
        const result = await gallery_model_1.GalleryModel.findByIdAndDelete(id);
        if (!result) {
            throw new Error('Gallery item not found');
        }
    }
}
exports.GalleryRepository = GalleryRepository;
