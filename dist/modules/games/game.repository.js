"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRepository = exports.GameRepository = void 0;
const game_model_1 = require("./game.model");
class GameRepository {
    async create(input) {
        const doc = new game_model_1.GameMatchModel({
            ...input,
            status: input.status || 'waiting',
        });
        await doc.save();
        return (0, game_model_1.toGameMatch)(doc);
    }
    async findById(id) {
        const doc = await game_model_1.GameMatchModel.findById(id);
        return doc ? (0, game_model_1.toGameMatch)(doc) : undefined;
    }
    async findByUserId(userId, limit = 50) {
        const docs = await game_model_1.GameMatchModel.find({
            players: userId,
        })
            .sort({ createdAt: -1 })
            .limit(limit);
        return docs.map(game_model_1.toGameMatch);
    }
    async findByGameType(gameType, limit = 50) {
        const docs = await game_model_1.GameMatchModel.find({ gameType })
            .sort({ createdAt: -1 })
            .limit(limit);
        return docs.map(game_model_1.toGameMatch);
    }
    async findActiveByUserId(userId) {
        const docs = await game_model_1.GameMatchModel.find({
            players: userId,
            status: { $in: ['waiting', 'in-progress'] },
        }).sort({ createdAt: -1 });
        return docs.map(game_model_1.toGameMatch);
    }
    async update(id, updates) {
        const doc = await game_model_1.GameMatchModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
        return doc ? (0, game_model_1.toGameMatch)(doc) : undefined;
    }
    async getLeaderboard(gameType, limit = 100) {
        const matches = await game_model_1.GameMatchModel.find({
            gameType,
            status: 'completed',
        });
        const stats = new Map();
        for (const match of matches) {
            const players = match.players || [];
            const winner = match.winner;
            const scores = match.scores || {};
            for (const playerId of players) {
                if (!stats.has(playerId)) {
                    stats.set(playerId, { wins: 0, losses: 0, draws: 0, totalGames: 0, scores: [] });
                }
                const playerStats = stats.get(playerId);
                playerStats.totalGames++;
                // For reaction-test, track scores
                if (gameType === 'reaction-test' && scores[playerId] !== undefined) {
                    playerStats.scores.push(scores[playerId]);
                }
                if (!winner) {
                    playerStats.draws++;
                }
                else if (winner === playerId) {
                    playerStats.wins++;
                }
                else {
                    playerStats.losses++;
                }
            }
        }
        return Array.from(stats.entries())
            .map(([userId, playerStats]) => {
            const { scores, ...rest } = playerStats;
            const result = {
                userId,
                ...rest,
            };
            // For reaction-test, calculate best and average scores
            if (gameType === 'reaction-test' && scores.length > 0) {
                result.bestScore = Math.min(...scores);
                result.avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
            }
            return result;
        })
            .sort((a, b) => {
            // For reaction-test, sort by best score (lower is better)
            if (gameType === 'reaction-test') {
                const aScore = a.bestScore ?? Infinity;
                const bScore = b.bestScore ?? Infinity;
                return aScore - bScore;
            }
            // For other games, sort by wins
            return b.wins - a.wins || a.losses - b.losses;
        })
            .slice(0, limit);
    }
    async delete(id) {
        await game_model_1.GameMatchModel.findByIdAndDelete(id);
    }
    async abandonOldMatches(cutoffDate) {
        const result = await game_model_1.GameMatchModel.updateMany({
            status: { $in: ['waiting', 'in-progress'] },
            updatedAt: { $lt: cutoffDate },
        }, {
            $set: { status: 'abandoned' },
        });
        return result.modifiedCount;
    }
}
exports.GameRepository = GameRepository;
exports.gameRepository = new GameRepository();
