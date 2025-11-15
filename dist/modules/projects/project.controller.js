"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.getProjects = getProjects;
exports.getProject = getProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const http_error_1 = require("../../utils/http-error");
const project_service_1 = require("./project.service");
async function createProject(req, res, next) {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Project name is required'));
    }
    try {
        const project = await project_service_1.projectService.create({
            name: name.trim(),
        });
        res.status(201).json({
            status: 'success',
            data: project,
        });
    }
    catch (error) {
        if (error.code === 11000 || error.message?.includes('duplicate')) {
            return next((0, http_error_1.createHttpError)(409, 'Project with this name already exists'));
        }
        next(error);
    }
}
async function getProjects(req, res, next) {
    try {
        const projects = await project_service_1.projectService.findAll();
        res.json({
            status: 'success',
            data: projects,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getProject(req, res, next) {
    const id = req.params.id;
    try {
        const project = await project_service_1.projectService.findById(id);
        if (!project) {
            return next((0, http_error_1.createHttpError)(404, 'Project not found'));
        }
        res.json({
            status: 'success',
            data: project,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateProject(req, res, next) {
    const id = req.params.id;
    const { name } = req.body;
    if (name !== undefined && !name.trim()) {
        return next((0, http_error_1.createHttpError)(400, 'Project name cannot be empty'));
    }
    try {
        const updates = {};
        if (name !== undefined) {
            updates.name = name.trim();
        }
        const project = await project_service_1.projectService.update(id, updates);
        if (!project) {
            return next((0, http_error_1.createHttpError)(404, 'Project not found'));
        }
        res.json({
            status: 'success',
            data: project,
        });
    }
    catch (error) {
        if (error.code === 11000 || error.message?.includes('duplicate')) {
            return next((0, http_error_1.createHttpError)(409, 'Project with this name already exists'));
        }
        next(error);
    }
}
async function deleteProject(req, res, next) {
    const id = req.params.id;
    try {
        const deleted = await project_service_1.projectService.delete(id);
        if (!deleted) {
            return next((0, http_error_1.createHttpError)(404, 'Project not found'));
        }
        res.json({
            status: 'success',
            message: 'Project deleted',
        });
    }
    catch (error) {
        next(error);
    }
}
