"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCard = void 0;
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../config/env");
const http_error_1 = require("../utils/http-error");
const fs_1 = require("fs");
const uploadDir = env_1.env.uploadDir;
(0, fs_1.mkdirSync)(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = file.originalname.split('.').pop();
        cb(null, `card-${uniqueSuffix}.${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb((0, http_error_1.createHttpError)(400, 'Invalid file type. Only images are allowed.'));
    }
};
exports.uploadCard = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
});
