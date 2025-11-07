"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardService = void 0;
const board_repository_1 = require("./board.repository");
const DEFAULT_KANBAN_COLUMNS = ['To do', 'Doing', 'Done'];
const DEFAULT_SPRINT_COLUMNS = ['Backlog', 'Sprint', 'Review', 'Done'];
exports.boardService = {
    getDefaultColumns(type) {
        return type === 'kanban' ? DEFAULT_KANBAN_COLUMNS : DEFAULT_SPRINT_COLUMNS;
    },
    async create(input) {
        const columns = this.getDefaultColumns(input.type);
        return board_repository_1.boardRepository.create({
            ...input,
            columns,
        });
    },
    async findByOwnerId(ownerId) {
        return board_repository_1.boardRepository.findByOwnerId(ownerId);
    },
    async findById(id) {
        return board_repository_1.boardRepository.findById(id);
    },
    async update(id, updates) {
        return board_repository_1.boardRepository.update(id, updates);
    },
    async delete(id) {
        return board_repository_1.boardRepository.delete(id);
    },
};
