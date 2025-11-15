"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceManager = void 0;
const socket_emitter_1 = require("../../utils/socket-emitter");
const user_service_1 = require("../users/user.service");
class PresenceManager {
    states = new Map();
    /**
     * Update or create presence entry with the latest coordinates
     */
    async updateLocation(userId, coords) {
        const entry = this.getOrCreateState(userId);
        entry.coords = coords;
        entry.lastSeen = new Date();
        entry.isActive = true;
        await this.broadcastSnapshot();
    }
    /**
     * Mark an existing presence entry as online (no-op if user never shared location)
     */
    markUserOnline(userId) {
        const entry = this.states.get(userId);
        if (!entry)
            return;
        entry.isActive = true;
        entry.lastSeen = new Date();
        void this.broadcastSnapshot();
    }
    /**
     * Mark an existing presence entry as offline (no-op if user never shared location)
     */
    markUserOffline(userId) {
        const entry = this.states.get(userId);
        if (!entry)
            return;
        entry.isActive = false;
        entry.lastSeen = new Date();
        void this.broadcastSnapshot();
    }
    /**
     * Remove presence entry entirely (used if data should be cleared)
     */
    clearUser(userId) {
        if (this.states.delete(userId)) {
            void this.broadcastSnapshot();
        }
    }
    /**
     * Current snapshot of users who have shared a location at least once
     */
    async getSnapshot() {
        const entries = Array.from(this.states.entries());
        const users = await Promise.all(entries.map(async ([userId, state]) => {
            if (!state.coords)
                return null;
            const profile = await user_service_1.userService.getPublicProfile(userId);
            if (!profile)
                return null;
            return {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                profilePic: profile.profilePic,
                lat: state.coords.lat,
                lng: state.coords.lng,
                accuracy: state.coords.accuracy,
                lastSeen: state.lastSeen.toISOString(),
                isActive: state.isActive,
            };
        }));
        return users.filter((user) => user !== null);
    }
    getOrCreateState(userId) {
        if (!this.states.has(userId)) {
            this.states.set(userId, {
                lastSeen: new Date(),
                isActive: false,
            });
        }
        return this.states.get(userId);
    }
    async broadcastSnapshot() {
        try {
            const snapshot = await this.getSnapshot();
            socket_emitter_1.SocketEmitter.emitToAll('presence:sync', { users: snapshot });
        }
        catch (error) {
            console.error('Failed to broadcast presence snapshot:', error);
        }
    }
}
exports.presenceManager = new PresenceManager();
