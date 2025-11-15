"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMeetHandlers = registerMeetHandlers;
const socket_1 = require("../../lib/socket");
const socket_rooms_1 = require("../../utils/socket-rooms");
const socket_emitter_1 = require("../../utils/socket-emitter");
/**
 * Register socket handlers for meet module
 * Handles WebRTC signaling, room management, and chat for video conferencing
 */
function registerMeetHandlers(socket) {
    const userId = socket.userId;
    if (!userId) {
        return;
    }
    // Join a meeting room
    socket.on('meet:join', (meetId) => {
        const room = (0, socket_rooms_1.meetRoom)(meetId);
        socket.join(room);
        console.log(`User ${userId} joined meet ${meetId}`);
        // Get existing participants in the room with their info
        const io = (0, socket_1.getSocketServer)();
        const roomSockets = io.sockets.adapter.rooms.get(room);
        const existingParticipants = [];
        if (roomSockets) {
            roomSockets.forEach((socketId) => {
                if (socketId !== socket.id) {
                    const otherSocket = io.sockets.sockets.get(socketId);
                    if (otherSocket?.userId) {
                        existingParticipants.push({
                            userId: otherSocket.userId,
                            userName: otherSocket.user?.name,
                            profilePic: otherSocket.user?.profilePic,
                        });
                    }
                }
            });
        }
        // Send existing participants to the new joiner
        if (existingParticipants.length > 0) {
            socket.emit('meet:existing-participants', {
                meetId,
                participants: existingParticipants,
                timestamp: new Date().toISOString(),
            });
        }
        // Notify other participants in the room about the new joiner
        socket.to(room).emit('meet:user-joined', {
            userId,
            userName: socket.user?.name,
            profilePic: socket.user?.profilePic,
            meetId,
            timestamp: new Date().toISOString(),
        });
    });
    // Leave a meeting room
    socket.on('meet:leave', (meetId) => {
        socket.leave((0, socket_rooms_1.meetRoom)(meetId));
        console.log(`User ${userId} left meet ${meetId}`);
        // Notify other participants in the room
        socket_emitter_1.SocketEmitter.emitToRoom((0, socket_rooms_1.meetRoom)(meetId), 'meet:user-left', {
            userId,
            meetId,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle WebRTC offer
    socket.on('meet:offer', (data) => {
        const { meetId, offer, targetUserId } = data;
        // Relay offer to target user
        socket_emitter_1.SocketEmitter.emitToUser(targetUserId, 'meet:offer', {
            fromUserId: userId,
            meetId,
            offer,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle WebRTC answer
    socket.on('meet:answer', (data) => {
        const { meetId, answer, targetUserId } = data;
        // Relay answer to target user
        socket_emitter_1.SocketEmitter.emitToUser(targetUserId, 'meet:answer', {
            fromUserId: userId,
            meetId,
            answer,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle ICE candidate
    socket.on('meet:ice-candidate', (data) => {
        const { meetId, candidate, targetUserId } = data;
        // Relay ICE candidate to target user
        socket_emitter_1.SocketEmitter.emitToUser(targetUserId, 'meet:ice-candidate', {
            fromUserId: userId,
            meetId,
            candidate,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle chat messages
    socket.on('meet:chat-message', (data) => {
        const { meetId, message } = data;
        // Broadcast chat message to all participants in the room (including sender)
        socket_emitter_1.SocketEmitter.emitToRoom((0, socket_rooms_1.meetRoom)(meetId), 'meet:chat-message', {
            userId,
            userName: socket.user?.name,
            meetId,
            message,
            timestamp: new Date().toISOString(),
        });
    });
    // Handle participant state updates (camera/mic/screen share toggles)
    socket.on('meet:participant-state', (data) => {
        const { meetId, isVideoEnabled, isAudioEnabled, isScreenSharing } = data;
        // Broadcast state update to all participants in the room
        socket_emitter_1.SocketEmitter.emitToRoom((0, socket_rooms_1.meetRoom)(meetId), 'meet:participant-state-updated', {
            userId,
            meetId,
            isVideoEnabled,
            isAudioEnabled,
            isScreenSharing,
            timestamp: new Date().toISOString(),
        });
    });
}
