import { Router } from 'express'
import {
  updateLocation,
  clearLocation,
  getEventLocations,
} from '../controllers/location.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

/**
 * @openapi
 * /location:
 *   post:
 *     tags: [Location]
 *     summary: Update current user's GPS location
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng]
 *             properties:
 *               lat: { type: number, example: 32.7157 }
 *               lng: { type: number, example: -117.1611 }
 *     responses:
 *       200:
 *         description: Location updated
 */
router.post('/', requireAuth, updateLocation)

/**
 * @openapi
 * /location:
 *   delete:
 *     tags: [Location]
 *     summary: Clear current user's location (called on check-out)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Location cleared
 */
router.delete('/', requireAuth, clearLocation)

/**
 * @openapi
 * /location/event/{eventId}:
 *   get:
 *     tags: [Location]
 *     summary: Get GPS locations of all "on course" members for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of member locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId: { type: string }
 *                   lat: { type: number }
 *                   lng: { type: number }
 *                   updatedAt: { type: string }
 *                   name: { type: string }
 *                   avatarColor: { type: string }
 */
router.get('/event/:eventId', getEventLocations)

export default router
