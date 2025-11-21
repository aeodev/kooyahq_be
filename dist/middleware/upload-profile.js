"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProfile = void 0;
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
exports.uploadProfile = {
    fields: (fields) => {
        return async (req, res, next) => {
            multerUpload.fields(fields)(req, res, async (err) => {
                if (err)
                    return next(err);
                const files = req.files;
                if (files) {
                    try {
                        const uploadPromises = [];
                        for (const field of fields) {
                            const fieldFiles = files[field.name];
                            if (fieldFiles) {
                                for (const file of fieldFiles) {
                                    uploadPromises.push((0, cloudinary_1.uploadToCloudinary)(file.buffer, 'profiles').then((result) => {
                                        ;
                                        file.cloudinaryUrl = result.secureUrl;
                                        file.cloudinaryPublicId = result.publicId;
                                    }));
                                }
                            }
                        }
                        await Promise.all(uploadPromises);
                    }
                    catch (error) {
                        return next((0, http_error_1.createHttpError)(500, 'Failed to upload images to Cloudinary'));
                    }
                }
                next();
            });
        };
    },
};
