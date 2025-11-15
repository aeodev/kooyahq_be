"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPresenceHandlers = registerPresenceHandlers;
const presence_manager_1 = require("./presence.manager");
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
function registerPresenceHandlers(socket) {
    const userId = socket.userId;
    if (!userId)
        return;
    const emitSnapshot = async () => {
        try {
            const snapshot = await presence_manager_1.presenceManager.getSnapshot();
            socket.emit('presence:sync', { users: snapshot });
        }
        catch (error) {
            console.error('Failed to emit presence snapshot:', error);
        }
    };
    socket.on('presence:request-sync', () => {
        void emitSnapshot();
    });
    socket.on('presence:update-location', async (payload) => {
        if (!payload)
            return;
        const { lat, lng, accuracy } = payload;
        if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
            return;
        }
        const coords = {
            lat,
            lng,
        };
        if (isFiniteNumber(accuracy)) {
            coords.accuracy = accuracy;
        }
        try {
            await presence_manager_1.presenceManager.updateLocation(userId, coords);
        }
        catch (error) {
            console.error(`Failed to update presence for user ${userId}:`, error);
        }
    });
    // Send snapshot immediately after handler registration
    void emitSnapshot();
}
