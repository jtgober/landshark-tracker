import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../database'
import type { AuthedRequest } from '../middleware/auth.middleware'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const TOKEN_EXPIRY = '7d'

const createUserId = () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const signup = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    })

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const id = createUserId()
    const createdAt = new Date().toISOString()

    await db.execute({
      sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      args: [id, email, passwordHash, createdAt],
    })

    const token = jwt.sign({ sub: id, email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    res.status(201).json({
      token,
      user: { id, email },
    })
  } catch (error) {
    console.error('Signup error', error)
    res.status(500).json({ message: 'Failed to sign up' })
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, password_hash FROM users WHERE email = ?',
      args: [email],
    })

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const row = result.rows[0]
    const userId = row.id as string
    const passwordHash = row.password_hash as string

    const isMatch = await bcrypt.compare(password, passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign({ sub: userId, email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    res.json({
      token,
      user: { id: userId, email },
    })
  } catch (error) {
    console.error('Login error', error)
    res.status(500).json({ message: 'Failed to log in' })
  }
}

export const updateMe = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { email, password } = req.body as {
    email?: string
    password?: string
  }

  if (!email && !password) {
    return res
      .status(400)
      .json({ message: 'Provide email and/or password to update' })
  }

  try {
    const fields: string[] = []
    const args: any[] = []

    if (email) {
      const existing = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
        args: [email, req.user.id],
      })
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'Email is already in use' })
      }
      fields.push('email = ?')
      args.push(email)
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      fields.push('password_hash = ?')
      args.push(passwordHash)
    }

    args.push(req.user.id)

    await db.execute({
      sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      args,
    })

    res.json({
      email: email ?? req.user.email,
    })
  } catch (error) {
    console.error('updateMe error', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
}

export const uploadAvatar = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' })
  }

  const relativeUrl = `/uploads/avatars/${file.filename}`

  try {
    await db.execute({
      sql: 'UPDATE users SET avatar_url = ? WHERE id = ?',
      args: [relativeUrl, req.user.id],
    })

    res.json({ avatarUrl: relativeUrl })
  } catch (error) {
    console.error('uploadAvatar error', error)
    res.status(500).json({ message: 'Failed to save avatar' })
  }
}


