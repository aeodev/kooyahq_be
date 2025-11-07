"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardRepository = void 0;
const board_model_1 = require("./board.model");
exports.boardRepository = {
    async create(input) {
        const doc = await board_model_1.BoardModel.create({
            name: input.name,
            type: input.type,
            ownerId: input.ownerId,
            memberIds: input.memberIds || [],
            columns: input.columns,
            sprintStartDate: input.sprintStartDate,
            sprintEndDate: input.sprintEndDate,
            sprintGoal: input.sprintGoal,
        });
        return (0, board_model_1.toBoard)(doc);
    },
    async findByOwnerId(ownerId) {
        const docs = await board_model_1.BoardModel.find({
            $or: [{ ownerId }, { memberIds: ownerId }],
        })
            .sort({ createdAt: -1 })
            .exec();
        return docs.map((doc) => (0, board_model_1.toBoard)(doc));
    },
    async findById(id) {
        const doc = await board_model_1.BoardModel.findById(id).exec();
        return doc ? (0, board_model_1.toBoard)(doc) : undefined;
    },
    async update(id, updates) {
        const updateData = { ...updates };
        if (updates.sprintStartDate === null) {
            updateData.$unset = { sprintStartDate: '' };
        }
        if (updates.sprintEndDate === null) {
            updateData.$unset = { ...updateData.$unset, sprintEndDate: '' };
        }
        const doc = await board_model_1.BoardModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return doc ? (0, board_model_1.toBoard)(doc) : undefined;
    },
    async delete(id) {
        const result = await board_model_1.BoardModel.findByIdAndDelete(id).exec();
        return !!result;
    },
};
