import { Request, Response } from 'express'
import { db } from '../database'
import { param } from '../utils/params'
import type { AuthedRequest } from '../middleware/auth.middleware'

export const updateLocation = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { lat, lng } = req.body as { lat?: number; lng?: number }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ message: 'lat and lng are required numbers' })
  }

  try {
    await db.execute(
      `INSERT INTO user_locations (user_id, lat, lng, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET lat = ?, lng = ?, updated_at = ?`,
      [
        req.user.id,
        lat,
        lng,
        new Date().toISOString(),
        lat,
        lng,
        new Date().toISOString(),
      ],
    )
    res.json({ success: true })
  } catch (error) {
    console.error('updateLocation error', error)
    res.status(500).json({ message: 'Failed to update location' })
  }
}

export const clearLocation = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    await db.execute('DELETE FROM user_locations WHERE user_id = ?', [
      req.user.id,
    ])
    res.status(204).end()
  } catch (error) {
    console.error('clearLocation error', error)
    res.status(500).json({ message: 'Failed to clear location' })
  }
}

export const getEventLocations = async (req: Request, res: Response) => {
  const eventId = param(req.params.eventId)

  if (!eventId) {
    return res.status(400).json({ message: 'eventId is required' })
  }

  try {
    const result = await db.execute(
      `SELECT ul.user_id AS userId, ul.lat, ul.lng, ul.updated_at AS updatedAt,
              m.name, m.avatarColor
       FROM user_locations ul
       JOIN user_attendance ua ON ua.user_id = ul.user_id AND ua.event_id = ?
       JOIN attendance a ON a.event_id = ? AND a.member_id = 'user-' || ul.user_id
       JOIN members m ON m.id = 'user-' || ul.user_id
       WHERE a.status = 'in'`,
      [eventId, eventId],
    )
    res.json(result.rows)
  } catch (error) {
    console.error('getEventLocations error', error)
    res.status(500).json({ message: 'Failed to fetch locations' })
  }
}
