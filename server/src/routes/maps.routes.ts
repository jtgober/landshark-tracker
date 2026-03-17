import { Router } from 'express'
import { getMapCoordinates, resolveMapUrl } from '../controllers/maps.controller'

const router = Router()

/**
 * @openapi
 * /maps/resolve:
 *   get:
 *     summary: Resolve short map URL
 *     tags: [Maps]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema: { type: string }
 *         description: Short map URL (maps.app.goo.gl, goo.gl)
 *     responses:
 *       200: { description: Resolved full URL }
 *       400: { description: Invalid or disallowed URL }
 *       502: { description: Failed to resolve }
 */
router.get('/resolve', resolveMapUrl)

/**
 * @openapi
 * /maps/coordinates:
 *   get:
 *     summary: Get coordinates from map URL
 *     tags: [Maps]
 *     description: Resolves short URLs, parses coordinates, or geocodes address from Google Maps links.
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema: { type: string }
 *         description: Google Maps URL (short or full)
 *     responses:
 *       200:
 *         description: Coordinates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lat: { type: number }
 *                 lng: { type: number }
 *       400: { description: Invalid or disallowed URL }
 *       404: { description: Could not extract location }
 *       502: { description: Failed to parse }
 */
router.get('/coordinates', getMapCoordinates)

export default router
