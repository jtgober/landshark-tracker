import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../database'
import type { AuthedRequest } from '../middleware/auth.middleware'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const TOKEN_EXPIRY = '7d'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'http://localhost:3001/api/auth/google/callback'

const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_APP_ID
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_APP_SECRET
const FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_REDIRECT_URI ||
  'http://localhost:3001/api/auth/facebook/callback'

const createUserId = () =>
  `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

async function ensureUserForEmail(email: string) {
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  })

  if (existing.rows.length > 0) {
    return existing.rows[0].id as string
  }

  const passwordHash = await bcrypt.hash(
    `social-${Math.random().toString(36).slice(2, 10)}`,
    10,
  )
  const id = createUserId()
  const createdAt = new Date().toISOString()

  await db.execute({
    sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    args: [id, email, passwordHash, createdAt],
  })

  return id
}

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

export const socialLoginDev = async (req: Request, res: Response) => {
  const { provider } = req.body as { provider?: string }

  if (!provider || !['google', 'facebook'].includes(provider)) {
    return res.status(400).json({ message: 'Unknown provider' })
  }

  const email = `${provider}_user@dev.local`

  try {
    const existing = await db.execute({
      sql: 'SELECT id, email FROM users WHERE email = ?',
      args: [email],
    })

    let userId: string

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id as string
    } else {
      const passwordHash = await bcrypt.hash(
        `${provider}-${Math.random().toString(36).slice(2, 10)}`,
        10,
      )
      userId = createUserId()
      const createdAt = new Date().toISOString()

      await db.execute({
        sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
        args: [userId, email, passwordHash, createdAt],
      })
    }

    const token = jwt.sign({ sub: userId, email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    res.json({
      token,
      user: { id: userId, email },
    })
  } catch (error) {
    console.error('socialLoginDev error', error)
    res.status(500).json({ message: 'Failed to log in with provider' })
  }
}

export const getMe = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const result = await db.execute(
      'SELECT email, avatar_url, avatar_updated_at FROM users WHERE id = ?',
      [req.user.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    const row = result.rows[0]
    res.json({
      email: row.email as string,
      avatarUrl: (row.avatar_url as string | null) ?? undefined,
      avatarUpdatedAt: (row.avatar_updated_at as string | null) ?? undefined,
    })
  } catch {
    res.status(500).json({ message: 'Failed to fetch profile' })
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
    const args: (string | number)[] = []

    if (email) {
      const existing = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id],
      )
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

    await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      args,
    )

    res.json({
      email: email ?? req.user.email,
    })
  } catch (error) {
    console.error('updateMe error', error)
    res.status(500).json({ message: 'Failed to update profile' })
  }
}

interface RequestWithFile extends AuthedRequest {
  file?: Express.Multer.File
}

export const uploadAvatar = async (req: RequestWithFile, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const file = req.file
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' })
  }

  const relativeUrl = `/uploads/avatars/${file.filename}`
  const updatedAt = new Date().toISOString()

  try {
    await db.execute(
      'UPDATE users SET avatar_url = ?, avatar_updated_at = ? WHERE id = ?',
      [relativeUrl, updatedAt, req.user.id],
    )

    res.json({ avatarUrl: relativeUrl, avatarUpdatedAt: updatedAt })
  } catch (error) {
    console.error('uploadAvatar error', error)
    res.status(500).json({ message: 'Failed to save avatar' })
  }
}
export const startGoogleOAuth = async (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ message: 'Google OAuth is not configured on the server' })
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}

export const googleOAuthCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined

  if (!code) {
    return res.status(400).send('Missing code')
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res
      .status(500)
      .send('Google OAuth is not configured on the server')
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = (await tokenRes.json()) as {
      access_token?: string
    }
    if (!tokenRes.ok) {
      console.error('Google token error', tokenData)
      return res.status(500).send('Failed to exchange Google code')
    }

    const userInfoRes = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const profile = (await userInfoRes.json()) as { email?: string }
    const email: string | undefined = profile.email

    if (!email) {
      return res.status(500).send('Google account has no email')
    }

    const userId = await ensureUserForEmail(email)

    const token = jwt.sign({ sub: userId, email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    const redirectUrl = new URL('/oauth/callback', FRONTEND_URL)
    redirectUrl.hash = `token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`

    res.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('googleOAuthCallback error', error)
    res.status(500).send('Google OAuth failed')
  }
}

export const startFacebookOAuth = async (req: Request, res: Response) => {
  if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ message: 'Facebook OAuth is not configured on the server' })
  }

  const params = new URLSearchParams({
    client_id: FACEBOOK_CLIENT_ID,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    response_type: 'code',
    scope: 'email',
  })

  res.redirect(`https://www.facebook.com/v15.0/dialog/oauth?${params.toString()}`)
}

export const facebookOAuthCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined

  if (!code) {
    return res.status(400).send('Missing code')
  }

  if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
    return res
      .status(500)
      .send('Facebook OAuth is not configured on the server')
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v15.0/oauth/access_token?${new URLSearchParams(
        {
          client_id: FACEBOOK_CLIENT_ID,
          client_secret: FACEBOOK_CLIENT_SECRET,
          redirect_uri: FACEBOOK_REDIRECT_URI,
          code,
        },
      ).toString()}`,
    )

    const tokenData = (await tokenRes.json()) as {
      access_token?: string
    }
    if (!tokenRes.ok) {
      console.error('Facebook token error', tokenData)
      return res.status(500).send('Failed to exchange Facebook code')
    }

    const userInfoRes = await fetch(
      `https://graph.facebook.com/me?${new URLSearchParams({
        fields: 'id,email',
        access_token: (tokenData.access_token ?? '') as string,
      }).toString()}`,
    )

    const profile = (await userInfoRes.json()) as { email?: string; id?: string }
    let email: string | undefined = profile.email

    if (!email) {
      email = `${profile.id ?? 'unknown'}@facebook.local`
    }

    const userId = await ensureUserForEmail(email)

    const token = jwt.sign({ sub: userId, email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    const redirectUrl = new URL('/oauth/callback', FRONTEND_URL)
    redirectUrl.hash = `token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`

    res.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('facebookOAuthCallback error', error)
    res.status(500).send('Facebook OAuth failed')
  }
}

