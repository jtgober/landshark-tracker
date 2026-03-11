import { Router } from 'express'
import { getMessages, postMessage } from '../controllers/messages.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

/**
 * @openapi
 * /messages/{eventId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get messages for an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of messages
 */
router.get('/:eventId', requireAuth, getMessages)

/**
 * @openapi
 * /messages/{eventId}:
 *   post:
 *     tags: [Messages]
 *     summary: Post a message to an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string }
 *     responses:
 *       201:
 *         description: Message posted
 */
router.post('/:eventId', requireAuth, postMessage)

export default router
