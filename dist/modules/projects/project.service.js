"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const project_repository_1 = require("./project.repository");
exports.projectService = {
    async create(input) {
        return project_repository_1.projectRepository.create(input);
    },
    async findAll() {
        return project_repository_1.projectRepository.findAll();
    },
    async findById(id) {
        return project_repository_1.projectRepository.findById(id);
    },
    async update(id, updates) {
        return project_repository_1.projectRepository.update(id, updates);
    },
    async delete(id) {
        return project_repository_1.projectRepository.delete(id);
    },
};
