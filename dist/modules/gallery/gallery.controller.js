"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGalleryItem = createGalleryItem;
exports.createMultipleGalleryItems = createMultipleGalleryItems;
exports.getGalleryItems = getGalleryItems;
exports.getGalleryItem = getGalleryItem;
exports.updateGalleryItem = updateGalleryItem;
exports.serveGalleryFile = serveGalleryFile;
exports.deleteGalleryItem = deleteGalleryItem;
const gallery_service_1 = require("./gallery.service");
const service = new gallery_service_1.GalleryService();
function getBaseUrl(req) {
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api`;
}
async function createGalleryItem(req, res) {
    const userId = req.user.id;
    const file = req.file;
    if (!file) {
        return res.status(400).json({ status: 'error', message: 'Image file is required' });
    }
    const title = req.body.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '');
    const description = req.body.description?.trim();
    const input = {
        title,
        description,
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: userId,
    };
    const baseUrl = getBaseUrl(req);
    const item = await service.create(userId, input, baseUrl);
    res.status(201).json({ status: 'success', data: item });
}
async function createMultipleGalleryItems(req, res) {
    const userId = req.user.id;
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files || files.length === 0) {
        return res.status(400).json({ status: 'error', message: 'At least one image file is required' });
    }
    const items = [];
    const baseUrl = getBaseUrl(req);
    files.forEach((file, index) => {
        // Try to get per-image title/description by index, fallback to generic or filename
        const title = req.body[`title-${index}`]?.trim()
            || req.body[`title-${file.fieldname}`]?.trim()
            || file.originalname.replace(/\.[^/.]+$/, '');
        const description = req.body[`description-${index}`]?.trim()
            || req.body[`description-${file.fieldname}`]?.trim();
        const input = {
            title,
            description,
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: userId,
        };
        items.push(input);
    });
    // Create all items
    const createdItems = await Promise.all(items.map((input) => service.create(userId, input, baseUrl)));
    res.status(201).json({ status: 'success', data: createdItems });
}
async function getGalleryItems(req, res) {
    const baseUrl = getBaseUrl(req);
    const items = await service.findAll(baseUrl);
    res.json({ status: 'success', data: items });
}
async function getGalleryItem(req, res) {
    const { id } = req.params;
    const baseUrl = getBaseUrl(req);
    const item = await service.findById(id, baseUrl);
    res.json({ status: 'success', data: item });
}
async function updateGalleryItem(req, res) {
    const { id } = req.params;
    const updates = {
        title: req.body.title?.trim(),
        description: req.body.description?.trim(),
    };
    const baseUrl = getBaseUrl(req);
    const item = await service.update(id, updates, baseUrl);
    res.json({ status: 'success', data: item });
}
async function serveGalleryFile(req, res) {
    const { filename } = req.params;
    const { join } = await Promise.resolve().then(() => __importStar(require('path')));
    const { existsSync, createReadStream, statSync } = await Promise.resolve().then(() => __importStar(require('fs')));
    const { env } = await Promise.resolve().then(() => __importStar(require('../../config/env')));
    const filePath = join(env.uploadDir, filename);
    if (!existsSync(filePath)) {
        return res.status(404).json({ status: 'error', message: 'File not found' });
    }
    const stats = statSync(filePath);
    // Get mimetype from filename
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
    };
    // Global CORS and helmet middleware handle cross-origin headers
    // Just set content headers for images
    res.setHeader('Content-Type', mimeTypes[ext || ''] || 'image/jpeg');
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    const file = createReadStream(filePath);
    file.pipe(res);
}
async function deleteGalleryItem(req, res) {
    const { id } = req.params;
    await service.delete(id);
    res.json({ status: 'success', message: 'Gallery item deleted' });
}
