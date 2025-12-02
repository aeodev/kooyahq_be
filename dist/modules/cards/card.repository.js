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
        const updateData = {};
        const unsetFields = {};
        // Handle regular fields
        if (updates.title !== undefined)
            updateData.title = updates.title;
        if (updates.description !== undefined)
            updateData.description = updates.description;
        if (updates.columnId !== undefined)
            updateData.columnId = updates.columnId;
        if (updates.issueType !== undefined)
            updateData.issueType = updates.issueType;
        if (updates.assigneeId !== undefined)
            updateData.assigneeId = updates.assigneeId;
        if (updates.priority !== undefined)
            updateData.priority = updates.priority;
        if (updates.labels !== undefined)
            updateData.labels = updates.labels;
        if (updates.attachments !== undefined)
            updateData.attachments = updates.attachments;
        if (updates.completed !== undefined)
            updateData.completed = updates.completed;
        if (updates.flagged !== undefined)
            updateData.flagged = updates.flagged;
        // Handle nullable fields
        if (updates.dueDate === null) {
            unsetFields.dueDate = '';
        }
        else if (updates.dueDate !== undefined) {
            updateData.dueDate = updates.dueDate;
        }
        if (updates.storyPoints === null) {
            unsetFields.storyPoints = '';
        }
        else if (updates.storyPoints !== undefined) {
            updateData.storyPoints = updates.storyPoints;
        }
        if (updates.epicId === null) {
            unsetFields.epicId = '';
        }
        else if (updates.epicId !== undefined) {
            updateData.epicId = updates.epicId;
        }
        if (updates.sprintId === null) {
            unsetFields.sprintId = '';
        }
        else if (updates.sprintId !== undefined) {
            updateData.sprintId = updates.sprintId;
        }
        if (updates.rank === null) {
            unsetFields.rank = '';
        }
        else if (updates.rank !== undefined) {
            updateData.rank = updates.rank;
        }
        // Handle coverImage - must be separate to avoid conflict
        if (updates.coverImage === null) {
            unsetFields.coverImage = '';
        }
        else if (updates.coverImage !== undefined) {
            updateData.coverImage = updates.coverImage;
        }
        // Build final update object
        const finalUpdate = {};
        if (Object.keys(updateData).length > 0) {
            finalUpdate.$set = updateData;
        }
        if (Object.keys(unsetFields).length > 0) {
            finalUpdate.$unset = unsetFields;
        }
        const doc = await card_model_1.CardModel.findByIdAndUpdate(id, finalUpdate, { new: true }).exec();
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
    // Checklist methods
    async addChecklist(cardId, checklist) {
        const doc = await card_model_1.CardModel.findByIdAndUpdate(cardId, { $push: { checklists: checklist } }, { new: true }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async updateChecklist(cardId, checklistId, updates) {
        const updateData = {};
        if (updates.title !== undefined) {
            updateData['checklists.$[checklist].title'] = updates.title;
        }
        const doc = await card_model_1.CardModel.findOneAndUpdate({ _id: cardId }, { $set: updateData }, {
            arrayFilters: [{ 'checklist.id': checklistId }],
            new: true,
        }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async deleteChecklist(cardId, checklistId) {
        const doc = await card_model_1.CardModel.findByIdAndUpdate(cardId, { $pull: { checklists: { id: checklistId } } }, { new: true }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async addChecklistItem(cardId, checklistId, item) {
        const doc = await card_model_1.CardModel.findOneAndUpdate({ _id: cardId, 'checklists.id': checklistId }, { $push: { 'checklists.$.items': item } }, { new: true }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async updateChecklistItem(cardId, checklistId, itemId, updates) {
        const updateData = {};
        if (updates.text !== undefined) {
            updateData['checklists.$[checklist].items.$[item].text'] = updates.text;
        }
        if (updates.completed !== undefined) {
            updateData['checklists.$[checklist].items.$[item].completed'] = updates.completed;
        }
        if (updates.order !== undefined) {
            updateData['checklists.$[checklist].items.$[item].order'] = updates.order;
        }
        const doc = await card_model_1.CardModel.findOneAndUpdate({ _id: cardId, 'checklists.id': checklistId, 'checklists.items.id': itemId }, { $set: updateData }, {
            arrayFilters: [{ 'checklist.id': checklistId }, { 'item.id': itemId }],
            new: true,
        }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
    async deleteChecklistItem(cardId, checklistId, itemId) {
        const doc = await card_model_1.CardModel.findOneAndUpdate({ _id: cardId, 'checklists.id': checklistId }, { $pull: { 'checklists.$.items': { id: itemId } } }, { new: true }).exec();
        return doc ? (0, card_model_1.toCard)(doc) : undefined;
    },
};
