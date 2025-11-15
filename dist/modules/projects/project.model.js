"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectModel = void 0;
exports.toProject = toProject;
const mongoose_1 = require("mongoose");
const projectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
}, {
    timestamps: true,
});
exports.ProjectModel = mongoose_1.models.Project ?? (0, mongoose_1.model)('Project', projectSchema);
function toProject(doc) {
    return {
        id: doc.id,
        name: doc.name,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
