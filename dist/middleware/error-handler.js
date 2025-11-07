"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    const { statusCode = 500, message } = error;
    res.status(statusCode).json({
        status: 'error',
        message,
    });
};
exports.errorHandler = errorHandler;
