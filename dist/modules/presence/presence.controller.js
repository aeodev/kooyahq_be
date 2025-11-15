"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresenceSnapshot = getPresenceSnapshot;
const presence_manager_1 = require("./presence.manager");
async function getPresenceSnapshot(_req, res, next) {
    try {
        const snapshot = await presence_manager_1.presenceManager.getSnapshot();
        res.json({
            status: 'success',
            data: snapshot,
        });
    }
    catch (error) {
        next(error);
    }
}
