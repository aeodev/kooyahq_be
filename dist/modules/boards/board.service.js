"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardService = exports.BoardService = void 0;
const board_repository_1 = require("./board.repository");
const mongoose_1 = require("mongoose");
const DEFAULT_KANBAN_COLUMNS = ['To do', 'Doing', 'Done'];
const DEFAULT_SPRINT_COLUMNS = ['Backlog', 'Sprint', 'Review', 'Done'];
class BoardService {
    async create(data) {
        const columns = data.columns ||
            (data.type === 'kanban' ? DEFAULT_KANBAN_COLUMNS : DEFAULT_SPRINT_COLUMNS);
        return board_repository_1.boardRepository.create({ ...data, columns });
    }
    async findByOwnerId(ownerId, type) {
        return board_repository_1.boardRepository.findByOwnerId(ownerId, type);
    }
    async findById(id) {
        return board_repository_1.boardRepository.findById(id);
    }
    async update(id, updates) {
        return board_repository_1.boardRepository.update(id, updates);
    }
    async delete(id) {
        return board_repository_1.boardRepository.delete(id);
    }
    // Sprint Management Methods
    async addSprint(boardId, data) {
        const board = await board_repository_1.boardRepository.findById(boardId);
        if (!board)
            return null;
        // Create new sprint object
        const newSprint = {
            _id: new mongoose_1.Types.ObjectId(),
            name: data.name,
            goal: data.goal,
            startDate: data.startDate,
            endDate: data.endDate,
            state: 'future',
            createdAt: new Date(),
            updatedAt: new Date(),
        }; // Cast to any to bypass strict type checking for subdocument creation
        // Use mongoose update to push to array
        // Note: In a real app, we might want to add this to the repository layer
        // But for now, we'll fetch, update, and save or use findByIdAndUpdate
        // Since repository.update is generic, let's try to use it or extend it.
        // Ideally, we should add specific methods to repository, but for MVP let's use direct model access or extend repository.
        // Given the current repository structure, let's assume we can't easily access the model directly here without importing it.
        // Let's add these methods to the Repository first or handle it here if we change the service to use the model directly?
        // The repository pattern is used. Let's check repository.ts content.
        // Wait, I don't have the full repository content in memory, but I saw it earlier.
        // It uses `BoardModel`.
        // Let's implement these in the service by extending the repository or just adding logic here if the repository allows partial updates that include push.
        // Standard repository.update usually does $set.
        // Let's implement `addSprint` in the repository for cleaner code.
        // But I am editing service.ts.
        // I will assume I can update the repository next.
        return board_repository_1.boardRepository.addSprint(boardId, newSprint);
    }
    async updateSprint(boardId, sprintId, updates) {
        // If setting to active, ensure no other sprint is active
        if (updates.state === 'active') {
            const board = await board_repository_1.boardRepository.findById(boardId);
            if (board) {
                const hasActive = board.sprints.some((s) => s.state === 'active' && s.id !== sprintId);
                if (hasActive) {
                    throw new Error('Another sprint is already active on this board');
                }
            }
        }
        return board_repository_1.boardRepository.updateSprint(boardId, sprintId, updates);
    }
    async deleteSprint(boardId, sprintId) {
        return board_repository_1.boardRepository.deleteSprint(boardId, sprintId);
    }
}
exports.BoardService = BoardService;
exports.boardService = new BoardService();
