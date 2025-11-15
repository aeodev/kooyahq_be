"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_model_1 = require("./user.model");
exports.userRepository = {
    async findById(id) {
        const doc = await user_model_1.UserModel.findById(id).exec();
        return doc ? (0, user_model_1.toUser)(doc) : undefined;
    },
    async getPublicProfile(id) {
        const doc = await user_model_1.UserModel.findById(id).exec();
        return doc ? (0, user_model_1.toPublicUser)((0, user_model_1.toUser)(doc)) : undefined;
    },
    async create(input) {
        const doc = await user_model_1.UserModel.create({
            email: input.email.toLowerCase(),
            name: input.name,
        });
        return (0, user_model_1.toPublicUser)((0, user_model_1.toUser)(doc));
    },
    async findAll() {
        const docs = await user_model_1.UserModel.find({}).sort({ name: 1 }).exec();
        return docs.map((doc) => (0, user_model_1.toPublicUser)((0, user_model_1.toUser)(doc)));
    },
    async updateProfile(id, updates) {
        const doc = await user_model_1.UserModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).exec();
        return doc ? (0, user_model_1.toPublicUser)((0, user_model_1.toUser)(doc)) : undefined;
    },
    async updateEmployee(id, updates) {
        const updateData = {};
        if (updates.name !== undefined) {
            updateData.name = updates.name.trim();
        }
        if (updates.email !== undefined) {
            updateData.email = updates.email.toLowerCase().trim();
        }
        if (updates.position !== undefined) {
            updateData.position = updates.position.trim() || undefined;
        }
        if (updates.birthday !== undefined) {
            updateData.birthday = updates.birthday ? new Date(updates.birthday) : undefined;
        }
        if (updates.isAdmin !== undefined) {
            updateData.isAdmin = updates.isAdmin;
        }
        const doc = await user_model_1.UserModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
        return doc ? (0, user_model_1.toPublicUser)((0, user_model_1.toUser)(doc)) : undefined;
    },
};
