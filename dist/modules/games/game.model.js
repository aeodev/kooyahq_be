"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameMatchModel = void 0;
exports.toGameMatch = toGameMatch;
const mongoose_1 = require("mongoose");
const gameMatchSchema = new mongoose_1.Schema({
    gameType: {
        type: String,
        required: true,
        enum: ['tic-tac-toe', 'rock-paper-scissors', 'number-guessing', 'reaction-test'],
        index: true,
    },
    players: {
        type: [String],
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['waiting', 'in-progress', 'completed', 'abandoned'],
        default: 'waiting',
        index: true,
    },
    winner: {
        type: String,
    },
    scores: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    startedAt: {
        type: Date,
    },
    endedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.GameMatchModel = mongoose_1.models.GameMatch ?? (0, mongoose_1.model)('GameMatch', gameMatchSchema);
function toGameMatch(doc) {
    return {
        id: doc.id,
        gameType: doc.gameType,
        players: doc.players || [],
        status: doc.status,
        winner: doc.winner,
        scores: doc.scores,
        metadata: doc.metadata,
        startedAt: doc.startedAt?.toISOString(),
        endedAt: doc.endedAt?.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
