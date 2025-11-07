"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameTypes = getGameTypes;
exports.createMatch = createMatch;
exports.getMatch = getMatch;
exports.getMyMatches = getMyMatches;
exports.getMyActiveMatches = getMyActiveMatches;
exports.updateMatch = updateMatch;
exports.getLeaderboard = getLeaderboard;
exports.getActiveUsers = getActiveUsers;
exports.cleanupOldMatches = cleanupOldMatches;
const game_service_1 = require("./game.service");
const http_error_1 = require("../../utils/http-error");
async function getGameTypes(_req, res) {
    const gameTypes = await game_service_1.gameService.getGameTypes();
    res.json({ status: 'success', data: gameTypes });
}
async function createMatch(req, res) {
    const userId = req.user.id;
    const { gameType, players, metadata } = req.body;
    if (!gameType) {
        return res.status(400).json({ status: 'error', message: 'Game type is required' });
    }
    if (!players || !Array.isArray(players) || players.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Players array is required' });
    }
    if (!players.includes(userId)) {
        return res.status(400).json({ status: 'error', message: 'You must be included in the players array' });
    }
    try {
        const match = await game_service_1.gameService.createMatch(userId, { gameType, players, metadata });
        res.json({ status: 'success', data: match });
    }
    catch (error) {
        if (error instanceof http_error_1.HttpError) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message });
        }
        throw error;
    }
}
async function getMatch(req, res) {
    const matchId = req.params.id;
    const match = await game_service_1.gameService.getMatch(matchId);
    if (!match) {
        return res.status(404).json({ status: 'error', message: 'Match not found' });
    }
    res.json({ status: 'success', data: match });
}
async function getMyMatches(req, res) {
    try {
        const userId = req.user.id;
        const matches = await game_service_1.gameService.getUserMatches(userId);
        res.json({ status: 'success', data: matches });
    }
    catch (error) {
        if (error instanceof http_error_1.HttpError) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message });
        }
        console.error('Error in getMyMatches:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch matches' });
    }
}
async function getMyActiveMatches(req, res) {
    try {
        const userId = req.user.id;
        const matches = await game_service_1.gameService.getActiveMatches(userId);
        res.json({ status: 'success', data: matches });
    }
    catch (error) {
        if (error instanceof http_error_1.HttpError) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message });
        }
        console.error('Error in getMyActiveMatches:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch active matches' });
    }
}
async function updateMatch(req, res) {
    const userId = req.user.id;
    const matchId = req.params.id;
    const updates = req.body;
    try {
        const match = await game_service_1.gameService.updateMatch(userId, matchId, updates);
        res.json({ status: 'success', data: match });
    }
    catch (error) {
        if (error instanceof http_error_1.HttpError) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message });
        }
        throw error;
    }
}
async function getLeaderboard(req, res) {
    const gameType = req.params.gameType;
    const limit = parseInt(req.query.limit) || 100;
    if (!gameType) {
        return res.status(400).json({ status: 'error', message: 'Game type is required' });
    }
    const leaderboard = await game_service_1.gameService.getLeaderboard(gameType, limit);
    res.json({ status: 'success', data: leaderboard });
}
async function getActiveUsers(_req, res) {
    const { activeUsersManager } = await Promise.resolve().then(() => __importStar(require('../../lib/active-users')));
    const activeUsers = await activeUsersManager.getActiveUsers();
    res.json({ status: 'success', data: activeUsers });
}
async function cleanupOldMatches(_req, res) {
    try {
        const olderThan = parseInt(_req.query.olderThan || '30');
        const count = await game_service_1.gameService.abandonOldMatches(olderThan);
        res.json({ status: 'success', data: { abandonedMatches: count } });
    }
    catch (error) {
        console.error('Error cleaning up old matches:', error);
        res.status(500).json({ status: 'error', message: 'Failed to cleanup matches' });
    }
}
