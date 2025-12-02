"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCard = createCard;
exports.getCardsByBoard = getCardsByBoard;
exports.moveCard = moveCard;
exports.updateCard = updateCard;
exports.getCardActivities = getCardActivities;
exports.uploadAttachment = uploadAttachment;
exports.deleteAttachment = deleteAttachment;
exports.bulkUpdateRanks = bulkUpdateRanks;
exports.deleteCard = deleteCard;
exports.createChecklist = createChecklist;
exports.updateChecklist = updateChecklist;
exports.deleteChecklist = deleteChecklist;
exports.createChecklistItem = createChecklistItem;
exports.updateChecklistItem = updateChecklistItem;
exports.deleteChecklistItem = deleteChecklistItem;
exports.setCardCover = setCardCover;
exports.removeCardCover = removeCardCover;
const board_service_1 = require("../boards/board.service");
const card_service_1 = require("./card.service");
const card_activity_repository_1 = require("./card-activity.repository");
const notification_service_1 = require("../notifications/notification.service");
const http_error_1 = require("../../utils/http-error");
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
    const { title, description, columnId, issueType, assigneeId, priority, labels, dueDate, storyPoints, completed, epicId, sprintId, rank, flagged, } = req.body;
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
        if (sprintId !== undefined) {
            updates.sprintId = sprintId || null;
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
        const url = file.cloudinaryUrl || '';
        const attachment = {
            filename: file.cloudinaryPublicId || file.originalname,
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
// Checklist controllers
async function createChecklist(req, res, next) {
    const { cardId } = req.params;
    const { title } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return next((0, http_error_1.createHttpError)(400, 'Checklist title is required'));
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
        const updated = await card_service_1.cardService.addChecklist(cardId, title);
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
async function updateChecklist(req, res, next) {
    const { cardId, checklistId } = req.params;
    const { title } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (title !== undefined && (!title || typeof title !== 'string' || title.trim().length === 0)) {
        return next((0, http_error_1.createHttpError)(400, 'Checklist title is required'));
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
        const updated = await card_service_1.cardService.updateChecklist(cardId, checklistId, { title });
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card or checklist not found'));
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
async function deleteChecklist(req, res, next) {
    const { cardId, checklistId } = req.params;
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
        const updated = await card_service_1.cardService.deleteChecklist(cardId, checklistId);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card or checklist not found'));
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
async function createChecklistItem(req, res, next) {
    const { cardId, checklistId } = req.params;
    const { text } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return next((0, http_error_1.createHttpError)(400, 'Item text is required'));
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
        const updated = await card_service_1.cardService.addChecklistItem(cardId, checklistId, text);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card or checklist not found'));
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
async function updateChecklistItem(req, res, next) {
    const { cardId, checklistId, itemId } = req.params;
    const { text, completed, order } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return next((0, http_error_1.createHttpError)(401, 'Unauthorized'));
    }
    if (text !== undefined && (!text || typeof text !== 'string' || text.trim().length === 0)) {
        return next((0, http_error_1.createHttpError)(400, 'Item text is required'));
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
        const updates = {};
        if (text !== undefined)
            updates.text = text;
        if (completed !== undefined)
            updates.completed = Boolean(completed);
        if (order !== undefined)
            updates.order = Number(order);
        const updated = await card_service_1.cardService.updateChecklistItem(cardId, checklistId, itemId, updates);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card, checklist, or item not found'));
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
async function deleteChecklistItem(req, res, next) {
    const { cardId, checklistId, itemId } = req.params;
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
        const updated = await card_service_1.cardService.deleteChecklistItem(cardId, checklistId, itemId);
        if (!updated) {
            return next((0, http_error_1.createHttpError)(404, 'Card, checklist, or item not found'));
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
// Cover controllers
async function setCardCover(req, res, next) {
    const { cardId } = req.params;
    const { url, color, brightness } = req.body;
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
        // If file is uploaded, use the file URL
        const file = req.file;
        const coverUrl = file
            ? (file.cloudinaryUrl || '')
            : url;
        // Build cover object: if image is uploaded, use URL and clear color. If color is provided, use color and clear URL.
        const cover = {};
        if (coverUrl) {
            // Image uploaded: set URL, clear color
            cover.url = coverUrl;
            cover.brightness = brightness;
        }
        else if (color) {
            // Color provided: set color, clear URL
            cover.color = color;
            cover.brightness = brightness;
        }
        const updated = await card_service_1.cardService.setCardCover(cardId, cover);
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
async function removeCardCover(req, res, next) {
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
        const updated = await card_service_1.cardService.removeCardCover(cardId);
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
