"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.createHttpError = createHttpError;
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}
exports.HttpError = HttpError;
function createHttpError(statusCode, message) {
    return new HttpError(statusCode, message);
}
