"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardService = void 0;
const board_service_1 = require("../boards/board.service");
const card_repository_1 = require("./card.repository");
exports.cardService = {
    async create(input) {
        const board = await board_service_1.boardService.findById(input.boardId);
        if (!board) {
            throw new Error('Board not found');
        }
        if (!board.columns.includes(input.columnId)) {
            throw new Error('Invalid column for this board');
        }
        return card_repository_1.cardRepository.create(input);
    },
    async findByBoardId(boardId) {
        return card_repository_1.cardRepository.findByBoardId(boardId);
    },
    async findById(id) {
        return card_repository_1.cardRepository.findById(id);
    },
    async moveCard(cardId, columnId, boardId) {
        const board = await board_service_1.boardService.findById(boardId);
        if (!board) {
            throw new Error('Board not found');
        }
        if (!board.columns.includes(columnId)) {
            throw new Error('Invalid column for this board');
        }
        return card_repository_1.cardRepository.update(cardId, { columnId });
    },
    async updateCard(cardId, updates) {
        if (updates.columnId) {
            const card = await card_repository_1.cardRepository.findById(cardId);
            if (!card) {
                throw new Error('Card not found');
            }
            const board = await board_service_1.boardService.findById(card.boardId);
            if (!board) {
                throw new Error('Board not found');
            }
            if (!board.columns.includes(updates.columnId)) {
                throw new Error('Invalid column for this board');
            }
        }
        return card_repository_1.cardRepository.update(cardId, updates);
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
};
