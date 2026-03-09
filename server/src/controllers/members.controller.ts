import { Request, Response } from 'express';
import { db } from '../database';

export const getMembers = async (req: Request, res: Response) => {
  try {
    const result = await db.execute('SELECT * FROM members');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM members WHERE id = ?',
      args: [req.params.id]
    });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
};
