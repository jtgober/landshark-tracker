import { Router } from 'express';
import { getActivity } from '../controllers/activity.controller';

const router = Router();

/**
 * @openapi
 * /activity:
 *   get:
 *     tags: [Activity]
 *     summary: Get the activity feed
 *     responses:
 *       200:
 *         description: Array of activity entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Activity'
 */
router.get('/', getActivity);

export default router;
