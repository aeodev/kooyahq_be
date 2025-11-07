"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.authenticateUser = authenticateUser;
const http_error_1 = require("../../utils/http-error");
const password_1 = require("../../utils/password");
const token_1 = require("../../utils/token");
const user_service_1 = require("../users/user.service");
const auth_repository_1 = require("./auth.repository");
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function validateEmail(email) {
    if (!EMAIL_REGEX.test(email)) {
        throw (0, http_error_1.createHttpError)(400, 'A valid email is required');
    }
}
function validatePassword(password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw (0, http_error_1.createHttpError)(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }
}
async function registerUser(input) {
    const email = normalizeEmail(input.email);
    const name = input.name.trim();
    const password = input.password;
    validateEmail(email);
    validatePassword(password);
    if (!name) {
        throw (0, http_error_1.createHttpError)(400, 'Name is required');
    }
    // Check if email already exists in Auth collection
    const existingAuth = await auth_repository_1.authRepository.findByEmail(email);
    if (existingAuth) {
        throw (0, http_error_1.createHttpError)(409, 'Email already in use');
    }
    const passwordHash = await (0, password_1.hashPassword)(password);
    // Create User profile first
    const user = await user_service_1.userService.create({
        email,
        name,
    });
    // Create Auth credentials with reference to User
    await auth_repository_1.authRepository.create({
        email,
        passwordHash,
        userId: user.id,
    });
    const token = (0, token_1.createAccessToken)(user);
    return {
        user,
        token,
    };
}
async function authenticateUser(input) {
    const email = normalizeEmail(input.email);
    const password = input.password;
    validateEmail(email);
    if (!password) {
        throw (0, http_error_1.createHttpError)(400, 'Email and password are required');
    }
    // Find auth credentials by email
    const auth = await auth_repository_1.authRepository.findByEmail(email);
    if (!auth) {
        throw (0, http_error_1.createHttpError)(401, 'Invalid credentials');
    }
    // Verify password
    const isValid = await (0, password_1.verifyPassword)(password, auth.passwordHash);
    if (!isValid) {
        throw (0, http_error_1.createHttpError)(401, 'Invalid credentials');
    }
    // Get user profile using userId from auth
    const user = await user_service_1.userService.getPublicProfile(auth.userId);
    if (!user) {
        throw (0, http_error_1.createHttpError)(401, 'User not found');
    }
    const token = (0, token_1.createAccessToken)(user);
    return {
        user,
        token,
    };
}
