"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardService = void 0;
const board_service_1 = require("../boards/board.service");
const card_repository_1 = require("./card.repository");
const card_activity_repository_1 = require("./card-activity.repository");
exports.cardService = {
    async create(input, userId) {
        const board = await board_service_1.boardService.findById(input.boardId);
        if (!board) {
            throw new Error('Board not found');
        }
        if (!board.columns.includes(input.columnId)) {
            throw new Error('Invalid column for this board');
        }
        const card = await card_repository_1.cardRepository.create(input);
        // Log creation
        await card_activity_repository_1.cardActivityRepository.create({
            cardId: card.id,
            boardId: card.boardId,
            userId,
            action: 'created',
            metadata: { columnId: card.columnId, issueType: card.issueType },
        });
        return card;
    },
    async findByBoardId(boardId) {
        return card_repository_1.cardRepository.findByBoardId(boardId);
    },
    async findById(id) {
        return card_repository_1.cardRepository.findById(id);
    },
    async moveCard(cardId, columnId, boardId, userId) {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }
        if (!board.columns.includes(columnId)) {
            throw new Error('Invalid column for this board');
        }
        const card = await card_repository_1.cardRepository.findById(cardId);
        if (!card) {
            throw new Error('Card not found');
        }
        const oldColumn = card.columnId;
        const updated = await card_repository_1.cardRepository.update(cardId, { columnId });
        // Log movement
        await card_activity_repository_1.cardActivityRepository.create({
            cardId,
            boardId,
            userId,
            action: 'moved',
            field: 'columnId',
            oldValue: oldColumn,
            newValue: columnId,
        });
        return updated;
    },
    async updateCard(cardId, updates, userId) {
        const card = await card_repository_1.cardRepository.findById(cardId);
        if (!card) {
            throw new Error('Card not found');
        }
        if (updates.columnId) {
            const board = await board_service_1.boardService.findById(card.boardId);
            if (!board) {
                throw new Error('Board not found');
            }
            if (!board.columns.includes(updates.columnId)) {
                throw new Error('Invalid column for this board');
            }
        }
        // Track field changes
        const activities = [];
        if (updates.title !== undefined && updates.title !== card.title) {
            activities.push({
                cardId,
                boardId: card.boardId,
                userId,
                action: 'updated',
                field: 'title',
                oldValue: card.title,
                newValue: updates.title,
            });
        }
        if (updates.assigneeId !== undefined && updates.assigneeId !== card.assigneeId) {
            activities.push({
                cardId,
                boardId: card.boardId,
                userId,
                action: updates.assigneeId ? 'assigned' : 'updated',
                field: 'assigneeId',
                oldValue: card.assigneeId || undefined,
                newValue: updates.assigneeId || undefined,
            });
        }
        if (updates.priority !== undefined && updates.priority !== card.priority) {
            activities.push({
                cardId,
                boardId: card.boardId,
                userId,
                action: 'updated',
                field: 'priority',
                oldValue: card.priority,
                newValue: updates.priority,
            });
        }
        if (updates.completed !== undefined && updates.completed !== card.completed) {
            activities.push({
                cardId,
                boardId: card.boardId,
                userId,
                action: 'completed',
                field: 'completed',
                oldValue: String(card.completed),
                newValue: String(updates.completed),
            });
        }
        if (updates.columnId !== undefined && updates.columnId !== card.columnId) {
            activities.push({
                cardId,
                boardId: card.boardId,
                userId,
                action: 'moved',
                field: 'columnId',
                oldValue: card.columnId,
                newValue: updates.columnId,
            });
        }
        const updated = await card_repository_1.cardRepository.update(cardId, updates);
        // Log all activities
        await Promise.all(activities.map(act => card_activity_repository_1.cardActivityRepository.create(act)));
        return updated;
    },
    async deleteCard(cardId) {
        const card = await card_repository_1.cardRepository.findById(cardId);
        if (!card) {
            return false;
        }
        return card_repository_1.cardRepository.delete(cardId);
    },
    async addAttachment(cardId, attachment) {
        const card = await card_repository_1.cardRepository.findById(cardId);
        if (!card) {
            return null;
        }
        const attachments = [...(card.attachments || []), attachment];
        return card_repository_1.cardRepository.update(cardId, { attachments });
    },
    async removeAttachment(cardId, attachmentId) {
        const card = await card_repository_1.cardRepository.findById(cardId);
        if (!card) {
            return null;
        }
        const attachments = (card.attachments || []).filter((att) => att._id?.toString() !== attachmentId && att.filename !== attachmentId);
        return card_repository_1.cardRepository.update(cardId, { attachments });
    },
    async bulkUpdateRanks(boardId, rankUpdates) {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }
        return card_repository_1.cardRepository.bulkUpdateRanks(boardId, rankUpdates);
    },
};
