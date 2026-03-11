import { Response } from 'express'
import { db } from '../database'
import { param } from '../utils/params'
import type { AuthedRequest } from '../middleware/auth.middleware'

export const getMessages = async (req: AuthedRequest, res: Response) => {
  const eventId = param(req.params.eventId)

  try {
    const result = await db.execute(
      `SELECT em.*, u.avatar_url, u.avatar_updated_at
       FROM event_messages em
       LEFT JOIN users u ON em.user_id = u.id
       WHERE em.event_id = ?
       ORDER BY em.created_at ASC
       LIMIT 100`,
      [eventId],
    )
    res.json(result.rows)
  } catch (error) {
    console.error('getMessages error', error)
    res.status(500).json({ message: 'Failed to fetch messages' })
  }
}

export const postMessage = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const eventId = param(req.params.eventId)
  const { body } = req.body as { body?: string }

  if (!body || !body.trim()) {
    return res.status(400).json({ message: 'Message body is required' })
  }

  try {
    const userRow = await db.execute(
      'SELECT display_name FROM users WHERE id = ?',
      [req.user.id],
    )
    const displayName = (userRow.rows[0]?.display_name as string | null) || req.user.email.split('@')[0]

    const memberRow = await db.execute(
      'SELECT avatarColor FROM members WHERE id = ?',
      [`user-${req.user.id}`],
    )
    const avatarColor = (memberRow.rows[0]?.avatarColor as string | null) || '#8ecae6'

    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const createdAt = new Date().toISOString()

    await db.execute(
      `INSERT INTO event_messages (id, event_id, user_id, user_name, avatar_color, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, eventId, req.user.id, displayName, avatarColor, body.trim(), createdAt],
    )

    const inserted = await db.execute(
      `SELECT em.*, u.avatar_url, u.avatar_updated_at
       FROM event_messages em
       LEFT JOIN users u ON em.user_id = u.id
       WHERE em.id = ?`,
      [id],
    )

    res.status(201).json(inserted.rows[0])
  } catch (error) {
    console.error('postMessage error', error)
    res.status(500).json({ message: 'Failed to post message' })
  }
}
