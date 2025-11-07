"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBoard = createBoard;
exports.getBoards = getBoards;
exports.getBoardById = getBoardById;
exports.updateBoard = updateBoard;
exports.deleteBoard = deleteBoard;
const board_service_1 = require("./board.service");
const notification_service_1 = require("../notifications/notification.service");
const http_error_1 = require("../../utils/http-error");
async function createBoard(req, res, next) {
    const { name, type } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return next((0, http_error_1.createHttpError)(400, 'Board name is required'));
    }
    if (!type || (type !== 'kanban' && type !== 'sprint')) {
        return next((0, http_error_1.createHttpError)(400, 'Board type must be "kanban" or "sprint"'));
    }
    try {
        const board = await board_service_1.boardService.create({
            name: name.trim(),
            type,
            ownerId: userId,
        });
        res.status(201).json({
            status: 'success',
            data: board,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getBoards(req, res, next) {
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const boards = await board_service_1.boardService.findByOwnerId(userId);
        res.json({
            status: 'success',
            data: boards,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getBoardById(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const board = await board_service_1.boardService.findById(id);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        res.json({
            status: 'success',
            data: board,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateBoard(req, res, next) {
    const { id } = req.params;
    const { name, memberIds, columns, columnLimits, sprintStartDate, sprintEndDate, sprintGoal } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const board = await board_service_1.boardService.findById(id);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const previousMemberIds = board.memberIds || [];
        const updates = {};
        if (name !== undefined) {
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return next((0, http_error_1.createHttpError)(400, 'Board name is required'));
            }
            updates.name = name.trim();
        }
        if (memberIds !== undefined) {
            updates.memberIds = Array.isArray(memberIds) ? memberIds : [];
        }
        if (columns !== undefined) {
            updates.columns = Array.isArray(columns) ? columns : [];
        }
        if (columnLimits !== undefined) {
            updates.columnLimits = columnLimits && typeof columnLimits === 'object' ? columnLimits : {};
        }
        if (sprintStartDate !== undefined) {
            updates.sprintStartDate = sprintStartDate ? new Date(sprintStartDate) : null;
        }
        if (sprintEndDate !== undefined) {
            updates.sprintEndDate = sprintEndDate ? new Date(sprintEndDate) : null;
        }
        if (sprintGoal !== undefined) {
            updates.sprintGoal = sprintGoal?.trim() || null;
        }
        const updated = await board_service_1.boardService.update(id, updates);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        // Notify newly added members
        if (memberIds !== undefined) {
            try {
                const newMemberIds = updated.memberIds || [];
                const addedMemberIds = newMemberIds.filter((id) => !previousMemberIds.includes(id));
                await Promise.all(addedMemberIds.map((memberId) => notification_service_1.notificationService.createBoardMemberNotification(memberId, id, userId)));
            }
            catch (notifError) {
                console.error('Failed to create board member notification:', notifError);
            }
        }
        res.json({
            status: 'success',
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteBoard(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const board = await board_service_1.boardService.findById(id);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        await board_service_1.boardService.delete(id);
        res.json({
            status: 'success',
            message: 'Board deleted',
        });
    }
    catch (error) {
        next(error);
    }
}
