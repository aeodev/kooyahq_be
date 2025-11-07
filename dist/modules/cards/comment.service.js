"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const comment_repository_1 = require("./comment.repository");
const card_service_1 = require("./card.service");
exports.commentService = {
    async create(cardId, userId, content) {
        const card = await card_service_1.cardService.findById(cardId);
        if (!card) {
            throw new Error('Card not found');
        }
        return comment_repository_1.commentRepository.create({ cardId, userId, content });
    },
    async findByCardId(cardId) {
        return comment_repository_1.commentRepository.findByCardId(cardId);
    },
    async findById(id) {
        return comment_repository_1.commentRepository.findById(id);
    },
    async update(id, userId, content) {
        const comment = await comment_repository_1.commentRepository.findById(id);
        if (!comment) {
            throw new Error('Comment not found');
        }
        if (comment.userId !== userId) {
            throw new Error('Forbidden');
        }
        return comment_repository_1.commentRepository.update(id, content);
    },
    async delete(id, userId) {
        const comment = await comment_repository_1.commentRepository.findById(id);
        if (!comment) {
            return false;
        }
        if (comment.userId !== userId) {
            throw new Error('Forbidden');
        }
        return comment_repository_1.commentRepository.delete(id);
    },
};
