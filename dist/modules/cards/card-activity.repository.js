"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardActivityRepository = void 0;
const card_activity_model_1 = require("./card-activity.model");
function toActivity(doc) {
    return {
        id: doc.id,
        cardId: doc.cardId,
        boardId: doc.boardId,
        userId: doc.userId,
        action: doc.action,
        field: doc.field,
        oldValue: doc.oldValue,
        newValue: doc.newValue,
        metadata: doc.metadata,
        createdAt: doc.createdAt.toISOString(),
    };
}
exports.cardActivityRepository = {
    async create(input) {
        const doc = await card_activity_model_1.CardActivityModel.create(input);
        return toActivity(doc);
    },
    async findByCardId(cardId) {
        const docs = await card_activity_model_1.CardActivityModel.find({ cardId })
            .sort({ createdAt: -1 })
            .limit(100);
        return docs.map(toActivity);
    },
};
