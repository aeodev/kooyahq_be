"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_1 = require("./app");
const env_1 = require("./config/env");
const mongo_1 = require("./lib/mongo");
const socket_1 = require("./lib/socket");
async function start() {
    try {
        await (0, mongo_1.connectToDatabase)();
        const app = (0, app_1.createApp)();
        const server = (0, node_http_1.createServer)(app);
        // Initialize Socket.IO
        (0, socket_1.initializeSocket)(server);
        server.listen(env_1.env.port, () => {
            console.log(`🚀 API ready at http://localhost:${env_1.env.port}`);
        });
    }
    catch (error) {
        console.error('Failed to start server', error);
        process.exit(1);
    }
}
void start();
