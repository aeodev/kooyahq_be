"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthSnapshot = createHealthSnapshot;
const node_os_1 = __importDefault(require("node:os"));
function createHealthSnapshot() {
    const memory = process.memoryUsage();
    return {
        uptime: Number(process.uptime().toFixed(0)),
        timestamp: new Date().toISOString(),
        resources: {
            rss: memory.rss,
            heapTotal: memory.heapTotal,
            heapUsed: memory.heapUsed,
        },
        host: {
            hostname: node_os_1.default.hostname(),
            platform: node_os_1.default.platform(),
        },
    };
}
