"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardRepository = exports.BoardRepository = void 0;
const board_model_1 = require("./board.model");
class BoardRepository {
    async create(data) {
        const board = await board_model_1.BoardModel.create(data);
        return (0, board_model_1.toBoard)(board);
    }
    async findByOwnerId(ownerId, type) {
        const query = {
            $or: [{ ownerId }, { memberIds: ownerId }],
        };
        if (type) {
            query.type = type;
        }
        const boards = await board_model_1.BoardModel.find(query).sort({ updatedAt: -1 });
        return boards.map(board_model_1.toBoard);
    }
    async findById(id) {
        const board = await board_model_1.BoardModel.findById(id);
        return board ? (0, board_model_1.toBoard)(board) : null;
    }
    async update(id, updates) {
        const board = await board_model_1.BoardModel.findByIdAndUpdate(id, updates, { new: true });
        return board ? (0, board_model_1.toBoard)(board) : null;
    }
    async delete(id) {
        const result = await board_model_1.BoardModel.deleteOne({ _id: id });
        return result.deletedCount === 1;
    }
    // Sprint Methods
    async addSprint(boardId, sprint) {
        const board = await board_model_1.BoardModel.findByIdAndUpdate(boardId, { $push: { sprints: sprint } }, { new: true });
        return board ? (0, board_model_1.toBoard)(board) : null;
    }
    async updateSprint(boardId, sprintId, updates) {
        // Construct the update object dynamically
        const updateQuery = {};
        for (const [key, value] of Object.entries(updates)) {
            updateQuery[`sprints.$.${key}`] = value;
        }
        updateQuery[`sprints.$.updatedAt`] = new Date();
        const board = await board_model_1.BoardModel.findOneAndUpdate({ _id: boardId, 'sprints._id': sprintId }, { $set: updateQuery }, { new: true });
        return board ? (0, board_model_1.toBoard)(board) : null;
    }
    async deleteSprint(boardId, sprintId) {
        const board = await board_model_1.BoardModel.findByIdAndUpdate(boardId, { $pull: { sprints: { _id: sprintId } } }, { new: true });
        return board ? (0, board_model_1.toBoard)(board) : null;
    }
}
exports.BoardRepository = BoardRepository;
exports.boardRepository = new BoardRepository();
