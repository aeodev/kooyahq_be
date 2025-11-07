"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const error_handler_1 = require("./middleware/error-handler");
const auth_router_1 = require("./modules/auth/auth.router");
const board_router_1 = require("./modules/boards/board.router");
const card_router_1 = require("./modules/cards/card.router");
const user_router_1 = require("./modules/users/user.router");
const time_entry_router_1 = require("./modules/time-tracker/time-entry.router");
const gallery_router_1 = require("./modules/gallery/gallery.router");
const ai_news_router_1 = require("./modules/ai-news/ai-news.router");
const post_router_1 = require("./modules/posts/post.router");
const notification_router_1 = require("./modules/notifications/notification.router");
const game_router_1 = require("./modules/games/game.router");
const announcement_router_1 = require("./modules/announcements/announcement.router");
const health_1 = require("./routes/health");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', env_1.env.nodeEnv === 'production');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use((0, cors_1.default)({
        origin: env_1.env.clientUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(express_1.default.json());
    // Swagger Documentation
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'KooyaHQ API Documentation',
    }));
    app.use('/api/auth', auth_router_1.authRouter);
    app.use('/api/users', user_router_1.userRouter);
    app.use('/api/health', health_1.healthRouter);
    app.use('/api/time-entries', time_entry_router_1.timeEntryRouter);
    app.use('/api/gallery', gallery_router_1.galleryRouter);
    app.use('/api/ai-news', ai_news_router_1.aiNewsRouter);
    app.use('/api/posts', post_router_1.postRouter);
    app.use('/api/notifications', notification_router_1.notificationRouter);
    app.use('/api/games', game_router_1.gameRouter);
    app.use('/api/announcements', announcement_router_1.announcementRouter);
    // CRITICAL: Register board router BEFORE card router
    // This ensures /api/boards routes match before the more general /api routes
    app.use('/api/boards', board_router_1.boardRouter);
    // Card router routes (/api/boards/:boardId/cards and /api/cards/:id) come after
    app.use('/api', card_router_1.cardRouter);
    app.use((_req, res) => {
        res.status(404).json({ status: 'error', message: 'Route not found' });
    });
    app.use(error_handler_1.errorHandler);
    return app;
}
