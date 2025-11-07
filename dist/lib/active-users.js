"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeUsersManager = void 0;
const socket_emitter_1 = require("../utils/socket-emitter");
const user_service_1 = require("../modules/users/user.service");
/**
 * Track active users connected via socket
 */
class ActiveUsersManager {
    activeUsers = new Map();
    /**
     * Add a user to active users list
     */
    addUser(userId, socket) {
        this.activeUsers.set(socket.id, { userId, socket, joinedAt: new Date() });
        this.broadcastActiveUsers();
    }
    /**
     * Remove a user from active users list
     */
    removeUser(socketId) {
        this.activeUsers.delete(socketId);
        this.broadcastActiveUsers();
    }
    /**
     * Get all active user IDs
     */
    getActiveUserIds() {
        const userIds = Array.from(new Set(Array.from(this.activeUsers.values()).map((u) => u.userId)));
        return userIds;
    }
    /**
     * Get active users count
     */
    getActiveUsersCount() {
        return this.getActiveUserIds().length;
    }
    /**
     * Broadcast active users list to all connected clients
     */
    async broadcastActiveUsers() {
        const userIds = this.getActiveUserIds();
        const users = await Promise.all(userIds.map((id) => user_service_1.userService.getPublicProfile(id)));
        const activeUsers = users.filter(Boolean).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            profilePic: u.profilePic,
        }));
        socket_emitter_1.SocketEmitter.emitToAll('game:active-users', { users: activeUsers });
    }
    /**
     * Get active users list for initial load
     */
    async getActiveUsers() {
        const userIds = this.getActiveUserIds();
        const users = await Promise.all(userIds.map((id) => user_service_1.userService.getPublicProfile(id)));
        return users.filter(Boolean).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            profilePic: u.profilePic,
        }));
    }
}
exports.activeUsersManager = new ActiveUsersManager();
