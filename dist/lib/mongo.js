"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.disconnectFromDatabase = disconnectFromDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
let connected = false;
async function connectToDatabase() {
    if (connected) {
        return mongoose_1.default.connection;
    }
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(env_1.env.mongoUri);
    connected = true;
    return mongoose_1.default.connection;
}
async function disconnectFromDatabase() {
    if (!connected) {
        return;
    }
    await mongoose_1.default.disconnect();
    connected = false;
}
