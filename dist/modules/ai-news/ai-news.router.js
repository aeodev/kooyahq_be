"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiNewsRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const ai_news_controller_1 = require("./ai-news.controller");
exports.aiNewsRouter = (0, express_1.Router)();
exports.aiNewsRouter.use(authenticate_1.authenticate);
exports.aiNewsRouter.get('/', ai_news_controller_1.getAINews);
