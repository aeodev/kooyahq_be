"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardRepository = void 0;
const card_model_1 = require("./card.model");
exports.cardRepository = {
    async create(input) {
        const doc = await card_model_1.CardModel.create({
            title: input.title,
            description: input.description,
            boardId: input.boardId,
            columnId: input.columnId,
            issueType: input.issueType || 'task',
            assigneeId: input.assigneeId,
            priority: input.priority || 'medium',
            labels: input.labels || [],
            dueDate: input.dueDate,
            storyPoints: input.storyPoints,
        });
        return (0, card_model_1.toCard)(doc);
    },
    async findByBoardId(boardId) {
        const docs = await card_model_1.CardModel.find({ boardId }).sort({ createdAt: -1 }).exec();
        return docs.map((doc) => (0, card_model_1.toCard)(doc));
    },
    async findById(id) {
        const doc = await card_model_1.CardModel.findById(id).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async update(id, updates) {
        const updateData = { ...updates };
        if (updates.dueDate === null) {
            updateData.$unset = { dueDate: '' };
        }
        if (updates.storyPoints === null) {
            updateData.$unset = { ...updateData.$unset, storyPoints: '' };
        }
        const doc = await card_model_1.CardModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async delete(id) {
        const result = await card_model_1.CardModel.findByIdAndDelete(id).exec();
        return !!result;
    },
};
