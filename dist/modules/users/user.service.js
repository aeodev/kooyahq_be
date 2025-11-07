"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const user_repository_1 = require("./user.repository");
exports.userService = {
    findById(id) {
        return user_repository_1.userRepository.findById(id);
    },
    async getPublicProfile(id) {
        return user_repository_1.userRepository.getPublicProfile(id);
    },
    async create(input) {
        return user_repository_1.userRepository.create(input);
    },
    async findAll() {
        return user_repository_1.userRepository.findAll();
    },
    async updateProfile(id, updates) {
        return user_repository_1.userRepository.updateProfile(id, updates);
    },
};
