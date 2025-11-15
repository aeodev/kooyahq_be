"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const presence_controller_1 = require("./presence.controller");
exports.presenceRouter = (0, express_1.Router)();
exports.presenceRouter.get('/', authenticate_1.authenticate, presence_controller_1.getPresenceSnapshot);
