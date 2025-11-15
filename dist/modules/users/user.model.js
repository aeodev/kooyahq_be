"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
exports.toUser = toUser;
exports.toPublicUser = toPublicUser;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
        index: true,
    },
    profilePic: {
        type: String,
    },
    banner: {
        type: String,
    },
    bio: {
        type: String,
        trim: true,
    },
    position: {
        type: String,
        trim: true,
    },
    birthday: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.UserModel = mongoose_1.models.User ?? (0, mongoose_1.model)('User', userSchema);
function toUser(doc) {
    return {
        id: doc.id,
        email: doc.email,
        name: doc.name,
        isAdmin: doc.isAdmin ?? false,
        position: doc.position,
        birthday: doc.birthday?.toISOString(),
        profilePic: doc.profilePic,
        banner: doc.banner,
        bio: doc.bio,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
function toPublicUser(user) {
    return user;
}
