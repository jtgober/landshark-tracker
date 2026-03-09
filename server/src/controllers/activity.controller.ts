import { Request, Response } from 'express';
import { db } from '../database';

export const getActivity = async (req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM activity ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};
