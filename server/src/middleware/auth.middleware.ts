import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export type AuthUser = {
  id: string
  email: string
}

export interface AuthedRequest extends Request {
  user?: AuthUser
}

export const requireAuth = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub?: string
      email?: string
    }

    if (!payload.sub || !payload.email) {
      return res.status(401).json({ message: 'Invalid token payload' })
    }

    req.user = { id: payload.sub, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

