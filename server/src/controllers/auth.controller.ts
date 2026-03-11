import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../database'
import { param } from '../utils/params'
import type { AuthedRequest } from '../middleware/auth.middleware'

import crypto from 'crypto'
import nodemailer from 'nodemailer'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const TOKEN_EXPIRY = '7d'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const smtpTransport =
  process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null

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

async function ensureUserForEmail(email: string): Promise<{ id: string; role: string }> {
  const existing = await db.execute({
    sql: 'SELECT id, role FROM users WHERE email = ?',
    args: [email],
  })

  if (existing.rows.length > 0) {
    return {
      id: existing.rows[0].id as string,
      role: (existing.rows[0].role as string) || 'member',
    }
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

  return { id, role: 'member' }
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

    // New users default to 'member'; auto-promote if they match ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL
    const role = adminEmail && email.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : 'member'
    if (role === 'admin') {
      await db.execute({ sql: "UPDATE users SET role = 'admin' WHERE id = ?", args: [id] })
    }

    const token = jwt.sign({ sub: id, email, role }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    res.status(201).json({
      token,
      user: { id, email, role },
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
      sql: 'SELECT id, password_hash, role FROM users WHERE email = ?',
      args: [email],
    })

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const row = result.rows[0]
    const userId = row.id as string
    const passwordHash = row.password_hash as string
    const role = (row.role as string) || 'member'

    const isMatch = await bcrypt.compare(password, passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign({ sub: userId, email, role }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    res.json({
      token,
      user: { id: userId, email, role },
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
      sql: 'SELECT id, email, role FROM users WHERE email = ?',
      args: [email],
    })

    let userId: string
    let role = 'member'

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id as string
      role = (existing.rows[0].role as string) || 'member'
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

    const token = jwt.sign({ sub: userId, email, role }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    })

    res.json({
      token,
      user: { id: userId, email, role },
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
      'SELECT email, avatar_url, avatar_updated_at, phone, display_name, role FROM users WHERE id = ?',
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
      phone: (row.phone as string | null) ?? undefined,
      displayName: (row.display_name as string | null) ?? undefined,
      role: (row.role as string) || 'member',
    })
  } catch {
    res.status(500).json({ message: 'Failed to fetch profile' })
  }
}

export const updateMe = async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { email, password, phone, displayName } = req.body as {
    email?: string
    password?: string
    phone?: string
    displayName?: string
  }

  if (!email && !password && phone === undefined && displayName === undefined) {
    return res
      .status(400)
      .json({ message: 'Provide a field to update' })
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

    if (phone !== undefined) {
      fields.push('phone = ?')
      args.push(phone)
    }

    if (displayName !== undefined) {
      fields.push('display_name = ?')
      args.push(displayName)
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No changes to save.' })
    }

    args.push(req.user.id)

    await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      args,
    )

    // Sync display name to the members table so it shows in events
    if (displayName !== undefined) {
      const memberId = `user-${req.user.id}`
      await db.execute(
        'UPDATE members SET name = ? WHERE id = ?',
        [displayName, memberId],
      )
    }

    res.json({
      email: email ?? req.user.email,
      phone: phone,
      displayName: displayName,
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

    const { id: userId, role } = await ensureUserForEmail(email)

    const token = jwt.sign({ sub: userId, email, role }, JWT_SECRET, {
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

    const { id: userId, role } = await ensureUserForEmail(email)

    const token = jwt.sign({ sub: userId, email, role }, JWT_SECRET, {
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

async function resolveUserId(rawId: string): Promise<string | null> {
  const direct = await db.execute('SELECT id FROM users WHERE id = ?', [rawId])
  if (direct.rows.length > 0) return rawId

  // If passed a member ID (user-user-...), strip the leading user- prefix
  if (rawId.startsWith('user-')) {
    const stripped = rawId.replace(/^user-/, '')
    const retry = await db.execute('SELECT id FROM users WHERE id = ?', [stripped])
    if (retry.rows.length > 0) return stripped
  }

  return null
}

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      'SELECT id, email, avatar_url, avatar_updated_at, phone, display_name, role, created_at FROM users ORDER BY created_at DESC',
    )
    res.json(result.rows)
  } catch (error) {
    console.error('getUsers error', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
}

export const getUserById = async (req: Request, res: Response) => {
  const rawId = param(req.params.id)

  if (!rawId) {
    return res.status(400).json({ message: 'User ID is required' })
  }

  try {
    const userId = await resolveUserId(rawId)
    if (!userId) {
      return res.status(404).json({ message: 'User not found' })
    }

    const result = await db.execute(
      'SELECT id, email, avatar_url, avatar_updated_at, phone, created_at FROM users WHERE id = ?',
      [userId],
    )
    res.json(result.rows[0])
  } catch (error) {
    console.error('getUserById error', error)
    res.status(500).json({ message: 'Failed to fetch user' })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  const rawId = param(req.params.id)

  if (!rawId) {
    return res.status(400).json({ message: 'User ID is required' })
  }

  try {
    const userId = await resolveUserId(rawId)
    if (!userId) {
      return res.status(404).json({ message: 'User not found' })
    }

    const memberId = `user-${userId}`

    await db.execute('DELETE FROM user_locations WHERE user_id = ?', [userId])
    await db.execute('DELETE FROM user_attendance WHERE user_id = ?', [userId])
    await db.execute('DELETE FROM attendance WHERE member_id = ?', [memberId])
    await db.execute('DELETE FROM members WHERE id = ?', [memberId])
    await db.execute('DELETE FROM users WHERE id = ?', [userId])

    res.status(204).end()
  } catch (error) {
    console.error('deleteUser error', error)
    res.status(500).json({ message: 'Failed to delete user' })
  }
}

export const updateUserRole = async (req: AuthedRequest, res: Response) => {
  const rawId = param(req.params.id)
  const { role } = req.body as { role?: string }

  if (!rawId) {
    return res.status(400).json({ message: 'User ID is required' })
  }
  if (!role || !['admin', 'member'].includes(role)) {
    return res.status(400).json({ message: 'Role must be "admin" or "member"' })
  }

  try {
    const userId = await resolveUserId(rawId)
    if (!userId) {
      return res.status(404).json({ message: 'User not found' })
    }

    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId])
    res.json({ id: userId, role })
  } catch (error) {
    console.error('updateUserRole error', error)
    res.status(500).json({ message: 'Failed to update role' })
  }
}

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string }

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  try {
    const user = await db.execute('SELECT id FROM users WHERE email = ?', [email])

    // Always return success to avoid leaking whether the email exists
    if (user.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been generated.' })
    }

    const userId = user.rows[0].id as string
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    await db.execute(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, userId, expiresAt],
    )

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`

    if (smtpTransport) {
      await smtpTransport.sendMail({
        from: `"Shark Tracker" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset your Shark Tracker password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#006d77">Password Reset</h2>
            <p>You requested a password reset for your Shark Tracker account.</p>
            <p>Click the button below to set a new password. This link expires in 1 hour.</p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 28px;background:#006d77;color:#fff;
                      text-decoration:none;border-radius:999px;font-weight:600;margin:16px 0">
              Reset Password
            </a>
            <p style="font-size:13px;color:#888">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="font-size:12px;color:#aaa;margin-top:24px">
              Or copy this link: ${resetUrl}
            </p>
          </div>
        `,
      })
      console.log(`[Password Reset] Email sent to ${email}`)
    } else {
      console.log(`[Password Reset] No SMTP configured. Link for ${email}: ${resetUrl}`)
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    console.error('forgotPassword error', error)
    res.status(500).json({ message: 'Failed to process request' })
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string }

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  try {
    const result = await db.execute(
      'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ?',
      [token],
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset link' })
    }

    const row = result.rows[0]
    if (row.used) {
      return res.status(400).json({ message: 'This reset link has already been used' })
    }

    const expiresAt = new Date(row.expires_at as string)
    if (expiresAt < new Date()) {
      return res.status(400).json({ message: 'This reset link has expired' })
    }

    const userId = row.user_id as string
    const passwordHash = await bcrypt.hash(password, 10)

    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId])
    await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token])

    res.json({ message: 'Password has been reset successfully' })
  } catch (error) {
    console.error('resetPassword error', error)
    res.status(500).json({ message: 'Failed to reset password' })
  }
}

