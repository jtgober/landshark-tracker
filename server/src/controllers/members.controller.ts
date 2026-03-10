import { Request, Response } from 'express';
import { db } from '../database';
import { param } from '../utils/params';

export const getMembers = async (req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM members');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  const id = param(req.params.id);
  try {
    const result = await db.execute(
      'SELECT * FROM members WHERE id = ?',
      [id],
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
};
