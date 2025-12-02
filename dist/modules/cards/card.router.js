"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const upload_card_1 = require("../../middleware/upload-card");
const card_controller_1 = require("./card.controller");
const comment_controller_1 = require("./comment.controller");
exports.cardRouter = (0, express_1.Router)();
/**
 * @swagger
 * /boards/{boardId}/cards:
 *   post:
 *     summary: Create a new card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - columnId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               columnId:
 *                 type: string
 *               issueType:
 *                 type: string
 *                 enum: [task, bug, story, epic]
 *               priority:
 *                 type: string
 *                 enum: [lowest, low, medium, high, highest]
 *               assigneeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Card created successfully
 */
exports.cardRouter.post('/boards/:boardId/cards', authenticate_1.authenticate, card_controller_1.createCard);
/**
 * @swagger
 * /boards/{boardId}/cards:
 *   get:
 *     summary: Get all cards for a board
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of cards
 */
exports.cardRouter.get('/boards/:boardId/cards', authenticate_1.authenticate, card_controller_1.getCardsByBoard);
/**
 * @swagger
 * /cards/{id}/move:
 *   put:
 *     summary: Move card to different column
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - columnId
 *             properties:
 *               columnId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card moved successfully
 */
exports.cardRouter.put('/cards/:id/move', authenticate_1.authenticate, card_controller_1.moveCard);
/**
 * @swagger
 * /cards/{id}:
 *   put:
 *     summary: Update card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card updated
 */
exports.cardRouter.put('/cards/:id', authenticate_1.authenticate, card_controller_1.updateCard);
/**
 * @swagger
 * /cards/{id}/activities:
 *   get:
 *     summary: Get activity log for a card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of activities
 */
exports.cardRouter.get('/cards/:cardId/activities', authenticate_1.authenticate, card_controller_1.getCardActivities);
/**
 * @swagger
 * /boards/{boardId}/cards/bulk-rank:
 *   post:
 *     summary: Bulk update card ranks
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rankUpdates
 *             properties:
 *               rankUpdates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - rank
 *                   properties:
 *                     id:
 *                       type: string
 *                     rank:
 *                       type: number
 *     responses:
 *       200:
 *         description: Ranks updated successfully
 */
exports.cardRouter.post('/boards/:boardId/cards/bulk-rank', authenticate_1.authenticate, card_controller_1.bulkUpdateRanks);
/**
 * @swagger
 * /cards/{id}:
 *   delete:
 *     summary: Delete card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Card deleted
 */
exports.cardRouter.delete('/cards/:id', authenticate_1.authenticate, card_controller_1.deleteCard);
/**
 * @swagger
 * /cards/{cardId}/attachments:
 *   post:
 *     summary: Upload attachment to card
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Attachment uploaded
 */
exports.cardRouter.post('/cards/:cardId/attachments', authenticate_1.authenticate, upload_card_1.uploadCard.single('image'), card_controller_1.uploadAttachment);
/**
 * @swagger
 * /cards/{cardId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete card attachment
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment deleted
 */
exports.cardRouter.delete('/cards/:cardId/attachments/:attachmentId', authenticate_1.authenticate, card_controller_1.deleteAttachment);
/**
 * @swagger
 * /cards/{cardId}/comments:
 *   post:
 *     summary: Create comment on card
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 */
exports.cardRouter.post('/cards/:cardId/comments', authenticate_1.authenticate, comment_controller_1.createComment);
/**
 * @swagger
 * /cards/{cardId}/comments:
 *   get:
 *     summary: Get all comments for a card
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
exports.cardRouter.get('/cards/:cardId/comments', authenticate_1.authenticate, comment_controller_1.getCommentsByCard);
/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated
 */
exports.cardRouter.put('/comments/:id', authenticate_1.authenticate, comment_controller_1.updateComment);
/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 */
exports.cardRouter.delete('/comments/:id', authenticate_1.authenticate, comment_controller_1.deleteComment);
// Checklist routes
exports.cardRouter.post('/cards/:cardId/checklists', authenticate_1.authenticate, card_controller_1.createChecklist);
exports.cardRouter.put('/cards/:cardId/checklists/:checklistId', authenticate_1.authenticate, card_controller_1.updateChecklist);
exports.cardRouter.delete('/cards/:cardId/checklists/:checklistId', authenticate_1.authenticate, card_controller_1.deleteChecklist);
exports.cardRouter.post('/cards/:cardId/checklists/:checklistId/items', authenticate_1.authenticate, card_controller_1.createChecklistItem);
exports.cardRouter.put('/cards/:cardId/checklists/:checklistId/items/:itemId', authenticate_1.authenticate, card_controller_1.updateChecklistItem);
exports.cardRouter.delete('/cards/:cardId/checklists/:checklistId/items/:itemId', authenticate_1.authenticate, card_controller_1.deleteChecklistItem);
// Cover routes
exports.cardRouter.post('/cards/:cardId/cover', authenticate_1.authenticate, upload_card_1.uploadCard.single('image'), card_controller_1.setCardCover);
exports.cardRouter.delete('/cards/:cardId/cover', authenticate_1.authenticate, card_controller_1.removeCardCover);
