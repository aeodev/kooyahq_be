"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const DEFAULT_PORT = 5001;
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/kooyahq';
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
const jwtSecret = requireEnv('JWT_SECRET');
const DEFAULT_JWT_EXPIRES_IN = '7d';
function parseJwtExpiresIn(value) {
    if (!value) {
        return DEFAULT_JWT_EXPIRES_IN;
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
        return numeric;
    }
    return value;
}
function parseClientUrls(value) {
    if (!value) {
        return ['http://localhost:5173'];
    }
    return value.split(',').map(url => url.trim()).filter(Boolean);
}
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? DEFAULT_PORT),
    clientUrls: parseClientUrls(process.env.CLIENT_URL),
    jwtSecret,
    jwtExpiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
    mongoUri: process.env.MONGO_URI ?? DEFAULT_MONGO_URI,
    uploadDir: process.env.UPLOAD_DIR ?? './uploads',
    cloudinary: {
        cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
        apiKey: requireEnv('CLOUDINARY_API_KEY'),
        apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
    },
};
