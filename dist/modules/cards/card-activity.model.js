"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardActivityModel = void 0;
const mongoose_1 = require("mongoose");
const cardActivitySchema = new mongoose_1.Schema({
    cardId: { type: String, required: true, index: true },
    boardId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    action: {
        type: String,
        enum: ['created', 'updated', 'moved', 'assigned', 'completed', 'deleted', 'commented'],
        required: true,
    },
    field: String,
    oldValue: String,
    newValue: String,
    metadata: mongoose_1.Schema.Types.Mixed,
}, { timestamps: true });
exports.CardActivityModel = mongoose_1.models.CardActivity ?? (0, mongoose_1.model)('CardActivity', cardActivitySchema);
