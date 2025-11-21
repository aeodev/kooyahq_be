"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGalleryItem = createGalleryItem;
exports.createMultipleGalleryItems = createMultipleGalleryItems;
exports.getGalleryItems = getGalleryItems;
exports.getGalleryItem = getGalleryItem;
exports.updateGalleryItem = updateGalleryItem;
exports.deleteGalleryItem = deleteGalleryItem;
const gallery_service_1 = require("./gallery.service");
const service = new gallery_service_1.GalleryService();
async function createGalleryItem(req, res) {
    const userId = req.user.id;
    const file = req.file;
    if (!file) {
        return res.status(400).json({ status: 'error', message: 'Image file is required' });
    }
    const title = req.body.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '');
    const description = req.body.description?.trim();
    const cloudinaryUrl = file.cloudinaryUrl || '';
    const cloudinaryPublicId = file.cloudinaryPublicId || '';
    const input = {
        title,
        description,
        filename: cloudinaryPublicId || file.originalname,
        path: cloudinaryUrl,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: userId,
    };
    const item = await service.create(userId, input, '');
    res.status(201).json({ status: 'success', data: item });
}
async function createMultipleGalleryItems(req, res) {
    const userId = req.user.id;
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files || files.length === 0) {
        return res.status(400).json({ status: 'error', message: 'At least one image file is required' });
    }
    const items = [];
    files.forEach((file, index) => {
        // Try to get per-image title/description by index, fallback to generic or filename
        const title = req.body[`title-${index}`]?.trim()
            || req.body[`title-${file.fieldname}`]?.trim()
            || file.originalname.replace(/\.[^/.]+$/, '');
        const description = req.body[`description-${index}`]?.trim()
            || req.body[`description-${file.fieldname}`]?.trim();
        const cloudinaryUrl = file.cloudinaryUrl || '';
        const cloudinaryPublicId = file.cloudinaryPublicId || '';
        const input = {
            title,
            description,
            filename: cloudinaryPublicId || file.originalname,
            path: cloudinaryUrl,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: userId,
        };
        items.push(input);
    });
    // Create all items
    const createdItems = await Promise.all(items.map((input) => service.create(userId, input, '')));
    res.status(201).json({ status: 'success', data: createdItems });
}
async function getGalleryItems(req, res) {
    const items = await service.findAll('');
    res.json({ status: 'success', data: items });
}
async function getGalleryItem(req, res) {
    const { id } = req.params;
    const item = await service.findById(id, '');
    res.json({ status: 'success', data: item });
}
async function updateGalleryItem(req, res) {
    const { id } = req.params;
    const updates = {
        title: req.body.title?.trim(),
        description: req.body.description?.trim(),
    };
    const item = await service.update(id, updates, '');
    res.json({ status: 'success', data: item });
}
async function deleteGalleryItem(req, res) {
    const { id } = req.params;
    await service.delete(id);
    res.json({ status: 'success', message: 'Gallery item deleted' });
}
