"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.currentUser = currentUser;
const auth_service_1 = require("./auth.service");
function parseString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
async function register(req, res, next) {
    const body = req.body;
    const email = parseString(body.email);
    const password = parseString(body.password);
    const name = parseString(body.name);
    try {
        const { user, token } = await (0, auth_service_1.registerUser)({
            email,
            name,
            password,
        });
        res.status(201).json({
            status: 'success',
            data: {
                user,
                token,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
async function login(req, res, next) {
    const body = req.body;
    const email = parseString(body.email);
    const password = parseString(body.password);
    try {
        const { user, token } = await (0, auth_service_1.authenticateUser)({
            email,
            password,
        });
        res.json({
            status: 'success',
            data: {
                user,
                token,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
function currentUser(req, res) {
    res.json({
        status: 'success',
        data: {
            user: req.user ?? null,
        },
    });
}
