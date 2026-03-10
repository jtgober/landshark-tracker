import { Router } from 'express';
import { getAttendanceByEvent, toggleAttendance } from '../controllers/attendance.controller';

const router = Router();

/**
 * @openapi
 * /attendance/{eventId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance map for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Map of memberId → status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: string
 *                 enum: [in, out]
 */
router.get('/:eventId', getAttendanceByEvent);

/**
 * @openapi
 * /attendance/{eventId}/toggle/{memberId}:
 *   post:
 *     tags: [Attendance]
 *     summary: Toggle a member's attendance (in/out)
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Toggled status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 nextStatus: { type: string, enum: [in, out] }
 */
router.post('/:eventId/toggle/:memberId', toggleAttendance);

export default router;
