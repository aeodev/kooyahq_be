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
            epicId: input.epicId,
            rank: input.rank,
            flagged: input.flagged ?? false,
        });
        return (0, card_model_1.toCard)(doc);
    },
    async findByBoardId(boardId, sortByRank) {
        const sort = sortByRank
            ? { rank: 1, createdAt: -1 } // Sort by rank first (ascending), then by creation date
            : { createdAt: -1 };
        const docs = await card_model_1.CardModel.find({ boardId }).sort(sort).exec();
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
        if (updates.epicId === null) {
            updateData.$unset = { ...updateData.$unset, epicId: '' };
        }
        if (updates.rank === null) {
            updateData.$unset = { ...updateData.$unset, rank: '' };
        }
        const doc = await card_model_1.CardModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async bulkUpdateRanks(boardId, rankUpdates) {
        const bulkOps = rankUpdates.map(({ id, rank }) => ({
            updateOne: {
                filter: { _id: id, boardId },
                update: { $set: { rank } },
            },
        }));
        if (bulkOps.length > 0) {
            await card_model_1.CardModel.bulkWrite(bulkOps);
        }
        // Return updated cards
        const updatedIds = rankUpdates.map((u) => u.id);
        const docs = await card_model_1.CardModel.find({ _id: { $in: updatedIds }, boardId }).exec();
        return docs.map((doc) => (0, card_model_1.toCard)(doc));
    },
    async delete(id) {
        const result = await card_model_1.CardModel.findByIdAndDelete(id).exec();
        return !!result;
    },
};
