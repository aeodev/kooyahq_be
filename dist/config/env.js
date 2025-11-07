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
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? DEFAULT_PORT),
    clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
    jwtSecret,
    jwtExpiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
    mongoUri: process.env.MONGO_URI ?? DEFAULT_MONGO_URI,
    uploadDir: process.env.UPLOAD_DIR ?? './uploads',
};
