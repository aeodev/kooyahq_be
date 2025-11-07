"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameService = exports.GameService = void 0;
const game_repository_1 = require("./game.repository");
const user_repository_1 = require("../users/user.repository");
const http_error_1 = require("../../utils/http-error");
class GameService {
    async createMatch(userId, input) {
        if (!input.players.includes(userId)) {
            throw new http_error_1.HttpError(400, 'You must be a player in the match');
        }
        const match = await game_repository_1.gameRepository.create(input);
        return this.toPublicGameMatch(match);
    }
    async getMatch(matchId) {
        const match = await game_repository_1.gameRepository.findById(matchId);
        if (!match) {
            return undefined;
        }
        return this.toPublicGameMatch(match);
    }
    async getUserMatches(userId) {
        const matches = await game_repository_1.gameRepository.findByUserId(userId);
        return Promise.all(matches.map((match) => this.toPublicGameMatch(match)));
    }
    async getActiveMatches(userId) {
        const matches = await game_repository_1.gameRepository.findActiveByUserId(userId);
        return Promise.all(matches.map((match) => this.toPublicGameMatch(match)));
    }
    async updateMatch(userId, matchId, updates) {
        const match = await game_repository_1.gameRepository.findById(matchId);
        if (!match) {
            throw new http_error_1.HttpError(404, 'Match not found');
        }
        if (!match.players.includes(userId)) {
            throw new http_error_1.HttpError(403, 'You are not a player in this match');
        }
        // Convert ISO strings to Date objects for startedAt and endedAt
        const processedUpdates = { ...updates };
        if (updates.startedAt && typeof updates.startedAt === 'string') {
            processedUpdates.startedAt = new Date(updates.startedAt);
        }
        if (updates.endedAt && typeof updates.endedAt === 'string') {
            processedUpdates.endedAt = new Date(updates.endedAt);
        }
        const updated = await game_repository_1.gameRepository.update(matchId, processedUpdates);
        if (!updated) {
            throw new http_error_1.HttpError(404, 'Match not found');
        }
        return this.toPublicGameMatch(updated);
    }
    async getLeaderboard(gameType, limit = 100) {
        const leaderboard = await game_repository_1.gameRepository.getLeaderboard(gameType, limit);
        const userIds = leaderboard.map((entry) => entry.userId);
        const users = await Promise.all(userIds.map((id) => user_repository_1.userRepository.findById(id)));
        const userMap = new Map(users.filter(Boolean).map((u) => [u.id, u]));
        return leaderboard.map((entry) => {
            const user = userMap.get(entry.userId);
            const totalGames = entry.totalGames;
            const winRate = totalGames > 0 ? (entry.wins / totalGames) * 100 : 0;
            return {
                userId: entry.userId,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || '',
                wins: entry.wins,
                losses: entry.losses,
                draws: entry.draws,
                totalGames,
                winRate: Math.round(winRate * 10) / 10,
                bestScore: entry.bestScore,
                avgScore: entry.avgScore,
            };
        });
    }
    async abandonOldMatches(olderThanMinutes = 30) {
        const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
        const result = await game_repository_1.gameRepository.abandonOldMatches(cutoffDate);
        return result;
    }
    async getGameTypes() {
        return [
            {
                type: 'tic-tac-toe',
                name: 'Tic Tac Toe',
                description: 'Classic 3x3 grid strategy game',
            },
            {
                type: 'rock-paper-scissors',
                name: 'Rock Paper Scissors',
                description: 'Quick best-of-three rounds',
            },
            {
                type: 'number-guessing',
                name: 'Number Guessing',
                description: 'Compete to guess the number fastest',
            },
            {
                type: 'reaction-test',
                name: 'Reaction Test',
                description: 'Test your reaction speed',
            },
        ];
    }
    async toPublicGameMatch(match) {
        const userIds = match.players || [];
        const users = await Promise.all(userIds.map(async (id) => {
            try {
                return await user_repository_1.userRepository.findById(id);
            }
            catch {
                return null;
            }
        }));
        const playerNames = users.map((u) => u?.name || 'Unknown');
        let winnerName;
        if (match.winner) {
            try {
                const winnerUser = await user_repository_1.userRepository.findById(match.winner);
                winnerName = winnerUser?.name;
            }
            catch {
                winnerName = undefined;
            }
        }
        return {
            ...match,
            playerNames,
            winnerName,
        };
    }
}
exports.GameService = GameService;
exports.gameService = new GameService();
