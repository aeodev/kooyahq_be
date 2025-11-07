"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 12;
function hashPassword(plainText) {
    return bcryptjs_1.default.hash(plainText, SALT_ROUNDS);
}
function verifyPassword(plainText, hash) {
    return bcryptjs_1.default.compare(plainText, hash);
}
