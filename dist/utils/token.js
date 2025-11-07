"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.verifyAccessToken = verifyAccessToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function createAccessToken(user) {
    const options = {
        expiresIn: env_1.env.jwtExpiresIn,
    };
    return jsonwebtoken_1.default.sign({ sub: user.id, email: user.email, name: user.name }, env_1.env.jwtSecret, options);
}
function verifyAccessToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
    if (typeof payload === 'string') {
        throw new Error('Invalid token payload');
    }
    const { sub, email, name, iat, exp } = payload;
    if (!sub || !email) {
        throw new Error('Invalid token payload');
    }
    return {
        sub,
        email,
        name: name ?? '',
        iat: iat ?? 0,
        exp: exp ?? 0,
    };
}
