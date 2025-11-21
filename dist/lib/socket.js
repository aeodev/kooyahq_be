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
const presence_socket_1 = require("../modules/presence/presence.socket");
const meet_socket_1 = require("../modules/meet/meet.socket");
const active_users_1 = require("./active-users");
const time_entry_service_1 = require("../modules/time-tracker/time-entry.service");
const presence_manager_1 = require("../modules/presence/presence.manager");
let io = null;
// Track pending timer stops with 15-second grace period
// Key: userId, Value: timeout ID
const pendingTimerStops = new Map();
function initializeSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin
                if (!origin)
                    return callback(null, true);
                // Check if origin is in allowed list
                if (env_1.env.clientUrls.includes(origin)) {
                    return callback(null, true);
                }
                // In development, allow localhost with any port
                if (env_1.env.nodeEnv === 'development' && origin.startsWith('http://localhost:')) {
                    return callback(null, true);
                }
                callback(new Error('Not allowed by CORS'));
            },
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
            socket.user = { ...payload, id: user.id, name: user.name, profilePic: user.profilePic };
            next();
        }
        catch (error) {
            next(new Error('Invalid or expired token'));
        }
    });
    // Register all module handlers (called once at startup)
    socket_manager_1.socketHandlerRegistry.registerHandler(time_entry_socket_1.registerTimeEntryHandlers);
    socket_manager_1.socketHandlerRegistry.registerHandler(game_socket_1.registerGameHandlers);
    socket_manager_1.socketHandlerRegistry.registerHandler(presence_socket_1.registerPresenceHandlers);
    socket_manager_1.socketHandlerRegistry.registerHandler(meet_socket_1.registerMeetHandlers);
    io.on('connection', (socket) => {
        const userId = socket.userId;
        if (!userId) {
            socket.disconnect();
            return;
        }
        console.log(`Socket connected: ${userId}`);
        // Cancel any pending timer stop if user reconnected within grace period
        const pendingStop = pendingTimerStops.get(userId);
        if (pendingStop) {
            clearTimeout(pendingStop);
            pendingTimerStops.delete(userId);
            console.log(`Cancelled pending timer stop for user ${userId} (reconnected within grace period)`);
        }
        // Join user's personal room for targeted updates
        socket.join((0, socket_rooms_1.userRoom)(userId));
        // Track active user
        active_users_1.activeUsersManager.addUser(userId, socket);
        presence_manager_1.presenceManager.markUserOnline(userId);
        // Register all module handlers for this socket connection
        socket_manager_1.socketHandlerRegistry.registerAllHandlers(socket);
        socket.on('disconnect', async () => {
            console.log(`Socket disconnected: ${userId}`);
            // Check if this is the user's last socket connection before removing
            const hasOtherConnections = active_users_1.activeUsersManager.hasOtherActiveConnections(userId, socket.id);
            // Remove the socket from active users
            active_users_1.activeUsersManager.removeUser(socket.id);
            // If this was the last connection, schedule timer stop after 15-second grace period
            if (!hasOtherConnections && userId) {
                presence_manager_1.presenceManager.markUserOffline(userId);
                // Clear any existing pending stop for this user
                const existingPending = pendingTimerStops.get(userId);
                if (existingPending) {
                    clearTimeout(existingPending);
                }
                // Set a 15-second timeout to stop the timer
                const timeoutId = setTimeout(async () => {
                    try {
                        const timeEntryService = new time_entry_service_1.TimeEntryService();
                        const activeTimer = await timeEntryService.getActiveTimer(userId);
                        if (activeTimer) {
                            // Double-check user still has no connections before stopping
                            if (!active_users_1.activeUsersManager.hasActiveConnection(userId)) {
                                console.log(`Auto-stopping timer for user ${userId} (15-second grace period expired)`);
                                await timeEntryService.stopTimer(userId);
                            }
                            else {
                                console.log(`Cancelled timer stop for user ${userId} (reconnected during grace period)`);
                            }
                        }
                    }
                    catch (error) {
                        // Log error but don't throw - socket disconnect shouldn't fail
                        console.error(`Error auto-stopping timer for user ${userId}:`, error);
                    }
                    finally {
                        // Clean up the pending stop from the map
                        pendingTimerStops.delete(userId);
                    }
                }, 15000); // 15 seconds grace period
                pendingTimerStops.set(userId, timeoutId);
                console.log(`Scheduled timer stop for user ${userId} in 15 seconds (grace period for page refresh)`);
            }
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
