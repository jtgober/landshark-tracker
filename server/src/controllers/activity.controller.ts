import { Request, Response } from 'express';
import { db } from '../database';

export const getActivity = async (req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM activity ORDER BY id DESC LIMIT 15');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};
