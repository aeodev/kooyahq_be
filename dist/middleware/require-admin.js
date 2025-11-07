"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const http_error_1 = require("../utils/http-error");
function requireAdmin(req, _res, next) {
    if (!req.user) {
        return next((0, http_error_1.createHttpError)(401, 'Authentication required'));
    }
    if (!req.user.isAdmin) {
        return next((0, http_error_1.createHttpError)(403, 'Admin access required'));
    }
    return next();
}
