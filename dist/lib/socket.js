"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
exports.getSocketServer = getSocketServer;
const socket_io_1 = require("socket.io");
const token_1 = require("../utils/token");
const user_service_1 = require("../modules/users/user.service");
const env_1 = require("../config/env");
const socket_manager_1 = require("./socket-manager");
const socket_rooms_1 = require("../utils/socket-rooms");
const time_entry_socket_1 = require("../modules/time-tracker/time-entry.socket");
const game_socket_1 = require("../modules/games/game.socket");
const active_users_1 = require("./active-users");
let io = null;
function initializeSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.env.clientUrl,
            credentials: true,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
    });
    // Authentication middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(new Error('Authentication token required'));
        }
        try {
            const payload = (0, token_1.verifyAccessToken)(token);
            const user = await user_service_1.userService.getPublicProfile(payload.sub);
            if (!user) {
                return next(new Error('User not found'));
            }
            socket.userId = user.id;
            socket.user = { ...payload, id: user.id };
            next();
        }
        catch (error) {
            next(new Error('Invalid or expired token'));
        }
    });
    // Register all module handlers (called once at startup)
    socket_manager_1.socketHandlerRegistry.registerHandler(time_entry_socket_1.registerTimeEntryHandlers);
    socket_manager_1.socketHandlerRegistry.registerHandler(game_socket_1.registerGameHandlers);
    io.on('connection', (socket) => {
        const userId = socket.userId;
        if (!userId) {
            socket.disconnect();
            return;
        }
        console.log(`Socket connected: ${userId}`);
        // Join user's personal room for targeted updates
        socket.join((0, socket_rooms_1.userRoom)(userId));
        // Track active user
        active_users_1.activeUsersManager.addUser(userId, socket);
        // Register all module handlers for this socket connection
        socket_manager_1.socketHandlerRegistry.registerAllHandlers(socket);
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${userId}`);
            active_users_1.activeUsersManager.removeUser(socket.id);
        });
    });
    return io;
}
function getSocketServer() {
    if (!io) {
        throw new Error('Socket server not initialized. Call initializeSocket() first.');
    }
    return io;
}
