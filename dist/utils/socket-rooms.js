"use strict";
/**
 * Room naming utilities for consistent socket room management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoom = userRoom;
exports.gameRoom = gameRoom;
exports.gameTypeRoom = gameTypeRoom;
exports.featureRoom = featureRoom;
exports.timeEntriesRoom = timeEntriesRoom;
exports.meetRoom = meetRoom;
function userRoom(userId) {
    return `user:${userId}`;
}
function gameRoom(gameId) {
    return `game:${gameId}`;
}
function gameTypeRoom(gameType) {
    return `game:type:${gameType}`;
}
function featureRoom(feature, id) {
    return id ? `${feature}:${id}` : `${feature}:all`;
}
function timeEntriesRoom() {
    return 'time-entries:all';
}
function meetRoom(meetId) {
    return `meet:${meetId}`;
}
