import { Request, Response } from 'express';
import { db } from '../database';

export const getAttendanceByEvent = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  
  try {
    const result = await db.execute({
      sql: 'SELECT member_id, status FROM attendance WHERE event_id = ?',
      args: [eventId]
    });

    const attendanceRecord: Record<string, string> = {};
    result.rows.forEach((row) => {
      attendanceRecord[row.member_id as string] = row.status as string;
    });

    res.json(attendanceRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const toggleAttendance = async (req: Request, res: Response) => {
  const { eventId, memberId } = req.params;

  try {
    // Check if event exists
    const eventResult = await db.execute({
      sql: 'SELECT name FROM events WHERE id = ?',
      args: [eventId]
    });
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const eventName = eventResult.rows[0].name as string;

    // Check if member exists
    const memberResult = await db.execute({
      sql: 'SELECT name FROM members WHERE id = ?',
      args: [memberId]
    });
    
    if (memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    const memberName = memberResult.rows[0].name as string;

    // Get current status
    const statusResult = await db.execute({
      sql: 'SELECT status FROM attendance WHERE event_id = ? AND member_id = ?',
      args: [eventId, memberId]
    });

    let currentStatus = 'out';
    if (statusResult.rows.length > 0) {
      currentStatus = statusResult.rows[0].status as string;
    }

    const nextStatus = currentStatus === 'in' ? 'out' : 'in';
    const lastAction = nextStatus === 'in' 
      ? `${eventName} · Checked in just now`
      : `${eventName} · Checked out just now`;

    // Execute updates in a transaction
    await db.executeMultiple(`
      INSERT INTO attendance (event_id, member_id, status)
      VALUES ('${eventId}', '${memberId}', '${nextStatus}')
      ON CONFLICT(event_id, member_id) DO UPDATE SET status = '${nextStatus}';

      UPDATE members 
      SET status = '${nextStatus}', lastAction = '${lastAction}'
      WHERE id = '${memberId}';

      INSERT INTO activity (id, time, description, type)
      VALUES (
        'act-${Date.now()}', 
        '${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}',
        '${memberName} checked ${nextStatus}',
        '${nextStatus}'
      );
    `);

    res.json({ success: true, nextStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle attendance' });
  }
};

