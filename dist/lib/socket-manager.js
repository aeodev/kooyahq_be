"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHandlerRegistry = void 0;
/**
 * Lightweight registry for socket handlers
 * Each module can register its handlers independently
 */
class SocketHandlerRegistry {
    handlers = [];
    /**
     * Register a socket handler function
     * Called once per module to register their handlers
     */
    registerHandler(handler) {
        this.handlers.push(handler);
    }
    /**
     * Initialize all registered handlers for a new socket connection
     * Called after socket authentication and basic setup
     */
    registerAllHandlers(socket) {
        for (const handler of this.handlers) {
            try {
                handler(socket);
            }
            catch (error) {
                console.error('Socket handler registration error:', error);
            }
        }
    }
    /**
     * Get count of registered handlers (for debugging)
     */
    getHandlerCount() {
        return this.handlers.length;
    }
}
exports.socketHandlerRegistry = new SocketHandlerRegistry();
