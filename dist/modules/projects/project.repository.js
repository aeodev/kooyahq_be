"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRepository = void 0;
const project_model_1 = require("./project.model");
exports.projectRepository = {
    async create(input) {
        const doc = await project_model_1.ProjectModel.create({
            name: input.name.trim(),
        });
        return (0, project_model_1.toProject)(doc);
    },
    async findAll() {
        const docs = await project_model_1.ProjectModel.find().sort({ name: 1 }).exec();
        return docs.map(project_model_1.toProject);
    },
    async findById(id) {
        const doc = await project_model_1.ProjectModel.findById(id).exec();
        return doc ? (0, project_model_1.toProject)(doc) : undefined;
    },
    async update(id, updates) {
        const updateData = {};
        if (updates.name !== undefined) {
            updateData.name = updates.name.trim();
        }
        const doc = await project_model_1.ProjectModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return doc ? (0, project_model_1.toProject)(doc) : undefined;
    },
    async delete(id) {
        const result = await project_model_1.ProjectModel.deleteOne({ _id: id }).exec();
        return result.deletedCount > 0;
    },
};
