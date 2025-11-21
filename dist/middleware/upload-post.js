"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPost = void 0;
const multer_1 = __importDefault(require("multer"));
const http_error_1 = require("../utils/http-error");
const cloudinary_1 = require("../utils/cloudinary");
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb((0, http_error_1.createHttpError)(400, 'Invalid file type. Only images are allowed.'));
    }
};
const multerUpload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
});
exports.uploadPost = {
    single: (fieldName) => {
        return async (req, res, next) => {
            multerUpload.single(fieldName)(req, res, async (err) => {
                if (err)
                    return next(err);
                if (req.file) {
                    try {
                        const result = await (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, 'posts');
                        req.file.cloudinaryUrl = result.secureUrl;
                        req.file.cloudinaryPublicId = result.publicId;
                    }
                    catch (error) {
                        return next((0, http_error_1.createHttpError)(500, 'Failed to upload image to Cloudinary'));
                    }
                }
                next();
            });
        };
    },
};
