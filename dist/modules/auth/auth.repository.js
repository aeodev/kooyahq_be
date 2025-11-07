"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const auth_model_1 = require("./auth.model");
exports.authRepository = {
    async findByEmail(email) {
        const doc = await auth_model_1.AuthModel.findOne({ email: email.toLowerCase() }).exec();
        return doc ? (0, auth_model_1.toAuth)(doc) : undefined;
    },
    async findByUserId(userId) {
        const doc = await auth_model_1.AuthModel.findOne({ userId }).exec();
        return doc ? (0, auth_model_1.toAuth)(doc) : undefined;
    },
    async create(input) {
        const doc = await auth_model_1.AuthModel.create({
            email: input.email.toLowerCase(),
            passwordHash: input.passwordHash,
            userId: input.userId,
        });
        return (0, auth_model_1.toAuth)(doc);
    },
    async updatePassword(userId, input) {
        const doc = await auth_model_1.AuthModel.findOneAndUpdate({ userId }, { $set: { passwordHash: input.passwordHash } }, { new: true }).exec();
        return doc ? (0, auth_model_1.toAuth)(doc) : undefined;
    },
    async delete(userId) {
        const result = await auth_model_1.AuthModel.deleteOne({ userId }).exec();
        return result.deletedCount > 0;
    },
};
