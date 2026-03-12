import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  getMyEvents,
  joinEventForUser,
  toggleSelfAttendance,
  leaveEventForUser,
  deleteEvent,
} from '../controllers/events.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @openapi
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: List all events
 *     responses:
 *       200:
 *         description: Array of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 */
router.get('/', getEvents);

/**
 * @openapi
 * /events/me:
 *   get:
 *     tags: [Events]
 *     summary: List events the current user has joined
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of events with userStatus
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Event'
 *                   - type: object
 *                     properties:
 *                       userStatus: { type: string, enum: [in, out] }
 */
router.get('/me', requireAuth, getMyEvents);

/**
 * @openapi
 * /events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get a single event by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Not found
 */
router.get('/:id', getEventById);

/**
 * @openapi
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Create a new event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               date: { type: string }
 *               time: { type: string }
 *               location: { type: string }
 *               type: { type: string, enum: [cycling, swimming, running], default: cycling }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Created event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 */
router.post('/', requireAuth, createEvent);

/**
 * @openapi
 * /events/{id}/join:
 *   post:
 *     tags: [Events]
 *     summary: Join an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Joined
 */
router.post('/:id/join', requireAuth, joinEventForUser);

/**
 * @openapi
 * /events/{id}/attendance/toggle:
 *   post:
 *     tags: [Events]
 *     summary: Toggle your own check-in status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Toggled
 */
router.post('/:id/attendance/toggle', requireAuth, toggleSelfAttendance);

/**
 * @openapi
 * /events/{id}/leave:
 *   post:
 *     tags: [Events]
 *     summary: Leave an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left event
 */
router.post('/:id/leave', requireAuth, leaveEventForUser);

/**
 * @openapi
 * /events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
/**
 * @openapi
 * /events/{id}:
 *   patch:
 *     tags: [Events]
 *     summary: Update an event (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               date: { type: string }
 *               time: { type: string }
 *               location: { type: string }
 *               type: { type: string, enum: [cycling, swimming, running] }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Updated event
 */
router.patch('/:id', requireAuth, updateEvent);

router.delete('/:id', requireAuth, deleteEvent);

export default router;
