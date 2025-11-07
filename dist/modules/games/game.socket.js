"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGameHandlers = registerGameHandlers;
const socket_rooms_1 = require("../../utils/socket-rooms");
const socket_emitter_1 = require("../../utils/socket-emitter");
/**
 * Register socket handlers for games module
 * Handles game invitations, room joining, and real-time game updates
 */
function registerGameHandlers(socket) {
    const userId = socket.userId;
    if (!userId) {
        return;
    }
    // Listen for game join requests
    socket.on('game:join', (gameId) => {
        socket.join((0, socket_rooms_1.gameRoom)(gameId));
        console.log(`User ${userId} joined game ${gameId}`);
    });
    socket.on('game:leave', (gameId) => {
        socket.leave((0, socket_rooms_1.gameRoom)(gameId));
        console.log(`User ${userId} left game ${gameId}`);
    });
    // Handle user pokes
    socket.on('user:poke', (data) => {
        const { pokedUserId } = data;
        // Emit poke notification to the poked user
        socket_emitter_1.SocketEmitter.emitToUser(pokedUserId, 'user:poked', {
            fromUserId: userId,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle game invitations
    socket.on('game:invite', (data) => {
        const { gameType, invitedUserId } = data;
        // Emit invitation to the invited user
        socket_emitter_1.SocketEmitter.emitToUser(invitedUserId, 'game:invitation', {
            fromUserId: userId,
            gameType,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle invitation acceptance
    socket.on('game:accept-invitation', (data) => {
        const { fromUserId, gameType } = data;
        // Notify the inviter that invitation was accepted
        socket_emitter_1.SocketEmitter.emitToUser(fromUserId, 'game:invitation-accepted', {
            acceptedByUserId: userId,
            gameType,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle game state updates (for real-time game play)
    socket.on('game:move', (data) => {
        const { gameId } = data;
        // Broadcast move to all players in the game room
        socket_emitter_1.SocketEmitter.emitToRoom((0, socket_rooms_1.gameRoom)(gameId), 'game:move-update', {
            userId,
            gameId,
            move: data.move,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle game state synchronization requests
    socket.on('game:request-state', (gameId) => {
        // This will be handled by game-specific logic
        // For now, just acknowledge the request
        socket.emit('game:state-requested', { gameId });
    });
}
