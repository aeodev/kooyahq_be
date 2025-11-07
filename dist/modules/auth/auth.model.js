"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModel = void 0;
exports.toAuth = toAuth;
const mongoose_1 = require("mongoose");
const authSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
}, {
    timestamps: true,
});
exports.AuthModel = mongoose_1.models.Auth ?? (0, mongoose_1.model)('Auth', authSchema);
function toAuth(doc) {
    return {
        id: doc.id,
        email: doc.email,
        passwordHash: doc.passwordHash,
        userId: doc.userId.toString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
