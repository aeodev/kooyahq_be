"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTimeEntryHandlers = registerTimeEntryHandlers;
const socket_rooms_1 = require("../../utils/socket-rooms");
/**
 * Register socket handlers for time-tracker module
 * Called automatically when socket connects
 */
function registerTimeEntryHandlers(socket) {
    const userId = socket.userId;
    if (!userId) {
        return;
    }
    // Join user's personal room for targeted updates (already joined in socket.ts)
    // Join global room for broadcast updates (time entries visible to all)
    socket.join((0, socket_rooms_1.timeEntriesRoom)());
}
