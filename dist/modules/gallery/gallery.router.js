"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.galleryRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const require_admin_1 = require("../../middleware/require-admin");
const upload_1 = require("../../middleware/upload");
const gallery_controller_1 = require("./gallery.controller");
exports.galleryRouter = (0, express_1.Router)();
// Public route to serve gallery files (CORS handled by global middleware)
exports.galleryRouter.get('/files/:filename', gallery_controller_1.serveGalleryFile);
// Viewing routes - require authentication but not admin
exports.galleryRouter.use(authenticate_1.authenticate);
exports.galleryRouter.get('/', gallery_controller_1.getGalleryItems);
exports.galleryRouter.get('/:id', gallery_controller_1.getGalleryItem);
// Modification routes - require admin access
exports.galleryRouter.use(require_admin_1.requireAdmin);
exports.galleryRouter.post('/', upload_1.upload.single('image'), gallery_controller_1.createGalleryItem);
exports.galleryRouter.post('/multiple', upload_1.upload.array('images', 20), gallery_controller_1.createMultipleGalleryItems);
exports.galleryRouter.put('/:id', gallery_controller_1.updateGalleryItem);
exports.galleryRouter.delete('/:id', gallery_controller_1.deleteGalleryItem);
