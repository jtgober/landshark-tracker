import { Request, Response } from 'express';
import { db } from '../database';
import type { AuthedRequest } from '../middleware/auth.middleware';
import { param } from '../utils/params';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM events ORDER BY id DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  const id = param(req.params.id);
  try {
    const result = await db.execute('SELECT * FROM events WHERE id = ?', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  const { name, date, time, location, locationUrl, courseMapUrl, type, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Event name is required' });
  }

  const newEvent = {
    id: `evt-${Date.now()}`,
    name,
    date: date || '',
    time: time || '',
    location: location || '',
    location_url: locationUrl || null,
    course_map_url: courseMapUrl || null,
    type: type || 'cycling',
    description: description || '',
  };

  try {
    await db.execute(
      `INSERT INTO events (id, name, date, time, location, location_url, course_map_url, type, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newEvent.id,
        newEvent.name,
        newEvent.date,
        newEvent.time,
        newEvent.location,
        newEvent.location_url,
        newEvent.course_map_url,
        newEvent.type,
        newEvent.description,
      ],
    );
    res.status(201).json(newEvent);
  } catch {
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getMyEvents = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await db.execute(
      `
        SELECT e.*, ua.status as userStatus
        FROM events e
        JOIN user_attendance ua
          ON ua.event_id = e.id
        WHERE ua.user_id = ?
        ORDER BY e.id DESC
      `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch your events' });
  }
};

export const joinEventForUser = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const eventId = param(req.params.id);

  try {
    const eventResult = await db.execute(
      'SELECT id, name FROM events WHERE id = ?',
      [eventId],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const eventName = eventResult.rows[0].name as string;

    const memberId = `user-${req.user.id}`;

    // Ensure a matching member exists, creating one if needed
    const memberResult = await db.execute(
      'SELECT id, name, avatarColor, status, lastAction FROM members WHERE id = ?',
      [memberId],
    );

    let member: {
      id: string
      name: string
      avatarColor: string
      status: string
      lastAction: string
    };

    if (memberResult.rows.length === 0) {
      // Prefer display_name from users table, fall back to email-derived name
      const userRow = await db.execute(
        'SELECT display_name FROM users WHERE id = ?',
        [req.user.id],
      );
      const displayName = userRow.rows[0]?.display_name as string | null;

      const emailLocal = req.user.email.split('@')[0];
      const prettyName =
        displayName ||
        emailLocal
          .replace(/[._]/g, ' ')
          .split(' ')
          .filter(Boolean)
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(' ') || req.user.email;

      const avatarColor = '#8ecae6';
      const lastAction = `${eventName} · Joined just now`;

      await db.execute(
        `INSERT INTO members (id, name, avatarColor, status, lastAction)
              VALUES (?, ?, ?, ?, ?)`,
        [memberId, prettyName, avatarColor, 'out', lastAction],
      );

      member = {
        id: memberId,
        name: prettyName,
        avatarColor,
        status: 'out',
        lastAction,
      };
    } else {
      const row = memberResult.rows[0];
      member = {
        id: row.id as string,
        name: row.name as string,
        avatarColor: row.avatarColor as string,
        status: row.status as string,
        lastAction: row.lastAction as string,
      };
    }

    // Ensure this member is part of the core attendance table for the event
    await db.executeMultiple(`
      INSERT INTO attendance (event_id, member_id, status)
      VALUES ('${eventId}', '${memberId}', 'out')
      ON CONFLICT(event_id, member_id) DO UPDATE SET status = 'out';

      INSERT INTO user_attendance (event_id, user_id, status)
      VALUES ('${eventId}', '${req.user.id}', 'out')
      ON CONFLICT(event_id, user_id) DO NOTHING;
    `);

    res.status(201).json({ eventId, status: 'out', member });
  } catch {
    res.status(500).json({ error: 'Failed to join event' });
  }
};

export const toggleSelfAttendance = async (
  req: AuthedRequest,
  res: Response,
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const eventId = param(req.params.id);

  try {
    const currentResult = await db.execute(
      'SELECT status FROM user_attendance WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id],
    );

    const currentStatus =
      currentResult.rows.length > 0
        ? (currentResult.rows[0].status as string)
        : 'out';

    const nextStatus = currentStatus === 'in' ? 'out' : 'in';

    await db.executeMultiple(`
      INSERT INTO user_attendance (event_id, user_id, status)
      VALUES ('${eventId}', '${req.user.id}', '${nextStatus}')
      ON CONFLICT(event_id, user_id) DO UPDATE SET status = '${nextStatus}';
    `);

    res.json({ eventId, status: nextStatus });
  } catch {
    res.status(500).json({ error: 'Failed to update your attendance' });
  }
};

export const leaveEventForUser = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const eventId = param(req.params.id);
  const memberId = `user-${req.user.id}`;

  try {
    await db.executeMultiple(`
      DELETE FROM user_attendance
      WHERE event_id = '${eventId}' AND user_id = '${req.user.id}';

      DELETE FROM attendance
      WHERE event_id = '${eventId}' AND member_id = '${memberId}';
    `);

    res.json({ eventId });
  } catch {
    res.status(500).json({ error: 'Failed to leave event' });
  }
};

export const updateEvent = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const eventId = param(req.params.id);
  const body = req.body as {
    name?: string
    date?: string
    time?: string
    location?: string
    locationUrl?: string | null
    courseMapUrl?: string | null
    course_map_url?: string | null
    type?: string
    description?: string
  };
  const { name, date, time, location, locationUrl, type, description } = body;
  const courseMapUrl = body.courseMapUrl ?? body.course_map_url;

  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM events WHERE id = ?',
      args: [eventId],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Ensure course_map_url column exists (migration may have been skipped)
    const colCheck = await db.execute({
      sql: "SELECT name FROM pragma_table_info('events') WHERE name = 'course_map_url'",
    });
    if (colCheck.rows.length === 0) {
      await db.execute({ sql: 'ALTER TABLE events ADD COLUMN course_map_url TEXT' });
    }

    const fields: string[] = [];
    const args: (string | null)[] = [];

    if (name !== undefined) { fields.push('name = ?'); args.push(name); }
    if (date !== undefined) { fields.push('date = ?'); args.push(date); }
    if (time !== undefined) { fields.push('time = ?'); args.push(time); }
    if (location !== undefined) { fields.push('location = ?'); args.push(location); }
    if (locationUrl !== undefined) { fields.push('location_url = ?'); args.push(locationUrl ?? null); }
    if (courseMapUrl !== undefined) { fields.push('course_map_url = ?'); args.push(courseMapUrl ?? null); }
    if (type !== undefined) { fields.push('type = ?'); args.push(type); }
    if (description !== undefined) { fields.push('description = ?'); args.push(description); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    args.push(eventId);

    await db.execute({
      sql: `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    // If course_map_url was in the batch, it should be updated. If not, run a dedicated update
    // (handles edge cases where it might be omitted from the dynamic build)
    if (courseMapUrl !== undefined) {
      await db.execute({
        sql: 'UPDATE events SET course_map_url = ? WHERE id = ?',
        args: [courseMapUrl ?? null, eventId],
      });
    }

    const updated = await db.execute({
      sql: 'SELECT * FROM events WHERE id = ?',
      args: [eventId],
    });
    res.json(updated.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const eventId = param(req.params.id);

  try {
    const existing = await db.execute('SELECT id FROM events WHERE id = ?', [eventId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await db.execute('DELETE FROM event_messages WHERE event_id = ?', [eventId]);
    await db.execute('DELETE FROM user_attendance WHERE event_id = ?', [eventId]);
    await db.execute('DELETE FROM attendance WHERE event_id = ?', [eventId]);
    await db.execute('DELETE FROM events WHERE id = ?', [eventId]);

    res.status(204).send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('deleteEvent error:', err);
    res.status(500).json({ error: 'Failed to delete event', message: msg });
  }
};


