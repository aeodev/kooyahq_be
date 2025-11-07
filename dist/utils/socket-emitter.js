"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEmitter = exports.TimeEntrySocketEvents = void 0;
const socket_1 = require("../lib/socket");
const socket_rooms_1 = require("./socket-rooms");
/**
 * Socket event names - must match frontend SocketTimeEntriesEventsEnum
 * Kept for backward compatibility
 */
exports.TimeEntrySocketEvents = {
    TIMER_STARTED: 'time-entry:timer-started',
    TIMER_STOPPED: 'time-entry:timer-stopped',
    TIMER_PAUSED: 'time-entry:timer-paused',
    TIMER_RESUMED: 'time-entry:timer-resumed',
    CREATED: 'time-entry:created',
    UPDATED: 'time-entry:updated',
    DELETED: 'time-entry:deleted',
};
/**
 * Generic socket emitter - works with any event type
 * Maintains type safety while being flexible for all modules
 */
class SocketEmitter {
    /**
     * Emit to all connected clients in the room
     */
    static emitToRoom(room, event, data) {
        try {
            const io = (0, socket_1.getSocketServer)();
            io.to(room).emit(event, data);
        }
        catch (error) {
            // Socket server might not be initialized in tests
            console.warn('Socket emit failed:', error);
        }
    }
    /**
     * Emit to a specific user's room
     */
    static emitToUser(userId, event, data) {
        this.emitToRoom((0, socket_rooms_1.userRoom)(userId), event, data);
    }
    /**
     * Emit to all users (broadcast)
     */
    static emitToAll(event, data) {
        try {
            const io = (0, socket_1.getSocketServer)();
            io.emit(event, data);
        }
        catch (error) {
            console.warn('Socket emit failed:', error);
        }
    }
    /**
     * Emit to a specific room by room name
     */
    static emitToRoomByName(room, event, data) {
        this.emitToRoom(room, event, data);
    }
    /**
     * Emit time entry update to all (for "All" tab visibility)
     * Backward compatibility helper for time-entry events
     */
    static emitTimeEntryUpdate(event, entry, userId) {
        const data = { entry, userId };
        this.emitToRoom((0, socket_rooms_1.timeEntriesRoom)(), event, data);
    }
}
exports.SocketEmitter = SocketEmitter;
