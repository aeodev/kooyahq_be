"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = getHealth;
const env_1 = require("../config/env");
const health_snapshot_1 = require("../utils/health-snapshot");
function getHealth(_req, res) {
    const snapshot = (0, health_snapshot_1.createHealthSnapshot)();
    res.json({
        status: 'ok',
        environment: env_1.env.nodeEnv,
        ...snapshot,
    });
}
