"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimerHeartbeatService = getTimerHeartbeatService;
exports.startTimerHeartbeat = startTimerHeartbeat;
exports.stopTimerHeartbeat = stopTimerHeartbeat;
const time_entry_repository_1 = require("./time-entry.repository");
const socket_emitter_1 = require("../../utils/socket-emitter");
const socket_rooms_1 = require("../../utils/socket-rooms");
const user_repository_1 = require("../users/user.repository");
/**
 * Timer heartbeat service - broadcasts active timer states every 5 seconds
 * to keep all browser windows synchronized
 */
class TimerHeartbeatService {
    intervalId = null;
    timeEntryRepo;
    HEARTBEAT_INTERVAL = 5000; // 5 seconds
    constructor() {
        this.timeEntryRepo = new time_entry_repository_1.TimeEntryRepository();
    }
    /**
     * Start the heartbeat service
     */
    start() {
        if (this.intervalId) {
            console.warn('Timer heartbeat service is already running');
            return;
        }
        console.log('Starting timer heartbeat service');
        // Run immediately on start, then every 5 seconds
        this.broadcastActiveTimers();
        this.intervalId = setInterval(() => {
            this.broadcastActiveTimers();
        }, this.HEARTBEAT_INTERVAL);
    }
    /**
     * Stop the heartbeat service
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Timer heartbeat service stopped');
        }
    }
    /**
     * Fetch all active timers and broadcast their current states
     */
    async broadcastActiveTimers() {
        try {
            // Fetch all active timers
            const activeTimers = await this.timeEntryRepo.findAllActive();
            if (activeTimers.length === 0) {
                // No active timers, nothing to broadcast
                return;
            }
            // Get user info for all timers
            const userIds = [...new Set(activeTimers.map(e => e.userId))];
            const users = await Promise.all(userIds.map(id => user_repository_1.userRepository.findById(id)));
            const userMap = new Map(users.filter(Boolean).map(u => [u.id, u]));
            // Convert to public entries with calculated durations using server time
            const publicTimers = await Promise.all(activeTimers.map(async (entry) => {
                const user = userMap.get(entry.userId);
                // Calculate current duration for active timers using server time
                let calculatedDuration = entry.duration;
                if (entry.isActive && entry.startTime) {
                    const now = new Date();
                    const start = new Date(entry.startTime);
                    // Calculate elapsed time
                    let elapsedMs = now.getTime() - start.getTime();
                    // Subtract paused duration if any
                    const pausedMs = entry.pausedDuration || 0;
                    // If currently paused, subtract current pause time
                    if (entry.isPaused && entry.lastPausedAt) {
                        const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime();
                        elapsedMs -= (pausedMs + currentPauseMs);
                    }
                    else {
                        elapsedMs -= pausedMs;
                    }
                    // Update duration in minutes
                    calculatedDuration = Math.max(0, Math.floor(elapsedMs / 60000));
                }
                const publicTimer = {
                    ...entry,
                    duration: calculatedDuration,
                    userName: user?.name || 'Unknown',
                    userEmail: user?.email || '',
                    canEdit: false, // Not relevant for heartbeat
                };
                return publicTimer;
            }));
            if (publicTimers.length === 0) {
                return;
            }
            // Broadcast to all clients in timeEntriesRoom
            // Each timer update includes userId for client-side filtering
            publicTimers.forEach((timer) => {
                socket_emitter_1.SocketEmitter.emitToRoom((0, socket_rooms_1.timeEntriesRoom)(), socket_emitter_1.TimeEntrySocketEvents.TIMER_HEARTBEAT, { entry: timer, userId: timer.userId });
            });
        }
        catch (error) {
            console.error('Error broadcasting timer heartbeat:', error);
            // Don't throw - keep the service running even if one broadcast fails
        }
    }
}
// Singleton instance
let heartbeatService = null;
/**
 * Get or create the heartbeat service singleton
 */
function getTimerHeartbeatService() {
    if (!heartbeatService) {
        heartbeatService = new TimerHeartbeatService();
    }
    return heartbeatService;
}
/**
 * Start the heartbeat service (call on server startup)
 */
function startTimerHeartbeat() {
    getTimerHeartbeatService().start();
}
/**
 * Stop the heartbeat service (call on server shutdown)
 */
function stopTimerHeartbeat() {
    if (heartbeatService) {
        heartbeatService.stop();
    }
}
