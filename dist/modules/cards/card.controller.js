"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCard = createCard;
exports.getCardsByBoard = getCardsByBoard;
exports.moveCard = moveCard;
exports.updateCard = updateCard;
exports.getCardActivities = getCardActivities;
exports.uploadAttachment = uploadAttachment;
exports.deleteAttachment = deleteAttachment;
exports.serveCardFile = serveCardFile;
exports.bulkUpdateRanks = bulkUpdateRanks;
exports.deleteCard = deleteCard;
const board_service_1 = require("../boards/board.service");
const card_service_1 = require("./card.service");
const card_activity_repository_1 = require("./card-activity.repository");
const notification_service_1 = require("../notifications/notification.service");
const http_error_1 = require("../../utils/http-error");
const env_1 = require("../../config/env");
async function createCard(req, res, next) {
    const { boardId } = req.params;
    const { title, description, columnId, issueType, assigneeId, priority, labels, dueDate, storyPoints, epicId, rank, flagged, } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return next((0, http_error_1.createHttpError)(400, 'Card title is required'));
    }
    try {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const targetColumnId = columnId || board.columns[0];
        const card = await card_service_1.cardService.create({
            title: title.trim(),
            description: description?.trim(),
            boardId,
            columnId: targetColumnId,
            issueType,
            assigneeId,
            priority,
            labels: Array.isArray(labels) ? labels : undefined,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            storyPoints: typeof storyPoints === 'number' ? storyPoints : undefined,
            epicId: typeof epicId === 'string' ? epicId : undefined,
            rank: typeof rank === 'number' ? rank : undefined,
            flagged: typeof flagged === 'boolean' ? flagged : undefined,
        }, userId);
        // Notify if card was assigned on creation
        if (assigneeId && assigneeId !== userId) {
            try {
                await notification_service_1.notificationService.createCardAssignmentNotification(assigneeId, card.id, userId);
            }
            catch (notifError) {
                console.error('Failed to create assignment notification:', notifError);
            }
        }
        res.status(201).json({
            status: 'success',
            data: card,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getCardsByBoard(req, res, next) {
    const { boardId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const cards = await card_service_1.cardService.findByBoardId(boardId);
        res.json({
            status: 'success',
            data: cards,
        });
    }
    catch (error) {
        next(error);
    }
}
async function moveCard(req, res, next) {
    const { id } = req.params;
    const { columnId, boardId } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!columnId || typeof columnId !== 'string') {
        return next((0, http_error_1.createHttpError)(400, 'Column ID is required'));
    }
    if (!boardId || typeof boardId !== 'string') {
        return next((0, http_error_1.createHttpError)(400, 'Board ID is required'));
    }
    try {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const card = await card_service_1.cardService.moveCard(id, columnId, boardId, userId);
        if (!card) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        res.json({
            status: 'success',
            data: card,
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateCard(req, res, next) {
    const { id } = req.params;
    const { title, description, columnId, issueType, assigneeId, priority, labels, dueDate, storyPoints, completed, epicId, rank, flagged, } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const card = await card_service_1.cardService.findById(id);
        if (!card) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        const board = await board_service_1.boardService.findById(card.boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const updates = {};
        if (title !== undefined) {
            if (!title || typeof title !== 'string' || title.trim().length === 0) {
                return next((0, http_error_1.createHttpError)(400, 'Card title is required'));
            }
            updates.title = title.trim();
        }
        if (description !== undefined) {
            updates.description = description?.trim() || undefined;
        }
        if (columnId !== undefined) {
            updates.columnId = columnId;
        }
        if (issueType !== undefined) {
            updates.issueType = issueType;
        }
        const previousAssigneeId = card.assigneeId;
        if (assigneeId !== undefined) {
            updates.assigneeId = assigneeId || null;
        }
        if (priority !== undefined) {
            updates.priority = priority;
        }
        if (labels !== undefined) {
            updates.labels = Array.isArray(labels) ? labels : [];
        }
        if (dueDate !== undefined) {
            updates.dueDate = dueDate ? new Date(dueDate) : null;
        }
        if (storyPoints !== undefined) {
            updates.storyPoints = storyPoints !== null && storyPoints !== undefined ? Number(storyPoints) : null;
        }
        if (completed !== undefined) {
            updates.completed = Boolean(completed);
        }
        if (epicId !== undefined) {
            updates.epicId = epicId || null;
        }
        if (rank !== undefined) {
            updates.rank = rank !== null && rank !== undefined ? Number(rank) : null;
        }
        if (flagged !== undefined) {
            updates.flagged = Boolean(flagged);
        }
        const updated = await card_service_1.cardService.updateCard(id, updates, userId);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        // Notify if assignee changed
        if (assigneeId !== undefined && assigneeId !== previousAssigneeId) {
            try {
                if (assigneeId && assigneeId !== userId) {
                    await notification_service_1.notificationService.createCardAssignmentNotification(assigneeId, id, userId);
                }
            }
            catch (notifError) {
                console.error('Failed to create assignment notification:', notifError);
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
async function getCardActivities(req, res, next) {
    const { cardId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const card = await card_service_1.cardService.findById(cardId);
        if (!card) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        const board = await board_service_1.boardService.findById(card.boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const activities = await card_activity_repository_1.cardActivityRepository.findByCardId(cardId);
        res.json({
            status: 'success',
            data: activities,
        });
    }
    catch (error) {
        next(error);
    }
}
function getBaseUrl(req) {
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:5001';
    return `${protocol}://${host}/api`;
}
async function uploadAttachment(req, res, next) {
    const { cardId } = req.params;
    const userId = req.user?.id;
    const file = req.file;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!file) {
        return next((0, http_error_1.createHttpError)(400, 'Image file is required'));
    }
    try {
        const card = await card_service_1.cardService.findById(cardId);
        if (!card) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        const board = await board_service_1.boardService.findById(card.boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const baseUrl = getBaseUrl(req);
        const url = `${baseUrl}/cards/files/${file.filename}`;
        const attachment = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url,
            uploadedBy: userId,
            uploadedAt: new Date(),
        };
        const updated = await card_service_1.cardService.addAttachment(cardId, attachment);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
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
async function deleteAttachment(req, res, next) {
    const { cardId, attachmentId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const card = await card_service_1.cardService.findById(cardId);
        if (!card) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        const board = await board_service_1.boardService.findById(card.boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const updated = await card_service_1.cardService.removeAttachment(cardId, attachmentId);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card or attachment not found'));
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
async function serveCardFile(req, res, next) {
    const { filename } = req.params;
    const { resolve } = await Promise.resolve().then(() => __importStar(require('path')));
    const { existsSync, createReadStream, statSync } = await Promise.resolve().then(() => __importStar(require('fs')));
    const filePath = resolve(env_1.env.uploadDir, filename);
    if (!existsSync(filePath)) {
        return res.status(404).json({ status: 'error', message: 'File not found' });
    }
    const stats = statSync(filePath);
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
    };
    res.setHeader('Content-Type', mimeTypes[ext || ''] || 'image/jpeg');
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    const file = createReadStream(filePath);
    file.pipe(res);
}
async function bulkUpdateRanks(req, res, next) {
    const { boardId } = req.params;
    const { rankUpdates } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!Array.isArray(rankUpdates)) {
        return next((0, http_error_1.createHttpError)(400, 'rankUpdates must be an array'));
    }
    try {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        const updates = rankUpdates.map((update) => ({
            id: update.id,
            rank: Number(update.rank),
        }));
        const updatedCards = await card_service_1.cardService.bulkUpdateRanks(boardId, updates);
        res.json({
            status: 'success',
            data: updatedCards,
        });
    }
    catch (error) {
        next(error);
    }
}
async function deleteCard(req, res, next) {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    try {
        const card = await card_service_1.cardService.findById(id);
        if (!card) {
            return next((0, http_error_1.createHttpError)(404, 'Card not found'));
        }
        const board = await board_service_1.boardService.findById(card.boardId);
        if (!board) {
            return next((0, http_error_1.createHttpError)(404, 'Board not found'));
        }
        if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
            return next((0, http_error_1.createHttpError)(403, 'Forbidden'));
        }
        await card_service_1.cardService.deleteCard(id);
        res.json({
            status: 'success',
            message: 'Card deleted',
        });
    }
    catch (error) {
        next(error);
    }
}
