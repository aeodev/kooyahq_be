"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const user_service_1 = require("../modules/users/user.service");
const http_error_1 = require("../utils/http-error");
const token_1 = require("../utils/token");
async function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next((0, http_error_1.createHttpError)(401, 'Authorization token missing'));
    }
    const token = authHeader.slice('Bearer '.length).trim();
    try {
        const payload = (0, token_1.verifyAccessToken)(token);
        const user = await user_service_1.userService.getPublicProfile(payload.sub);
        if (!user) {
            return next((0, http_error_1.createHttpError)(401, 'User not found'));
        }
        req.user = user;
        return next();
    }
    catch (error) {
        return next((0, http_error_1.createHttpError)(401, 'Invalid or expired token'));
    }
}
