import fs from 'fs'
import path from 'path'
import { Request, Response } from 'express'
import { db } from '../database'
import { param } from '../utils/params'
import { uploadsRoot } from '../paths'

const DICEBEAR_PIXEL_ART_PNG =
  'https://api.dicebear.com/9.x/pixel-art/png'

function mimeForAvatarFile(filePath: string): string {
  const e = path.extname(filePath).toLowerCase()
  if (e === '.png') return 'image/png'
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'
  if (e === '.gif') return 'image/gif'
  if (e === '.webp') return 'image/webp'
  return 'application/octet-stream'
}

async function streamDiceBearPng(res: Response, seed: string) {
  const url = `${DICEBEAR_PIXEL_ART_PNG}?seed=${encodeURIComponent(seed)}&size=128`
  const resp = await fetch(url, { headers: { Accept: 'image/png' } })
  if (!resp.ok) {
    return res.status(502).send('Failed to load default avatar')
  }
  const contentType = resp.headers.get('content-type') || 'image/png'
  res.set('Cache-Control', 'public, max-age=86400')
  res.set('Content-Type', contentType)
  const buf = await resp.arrayBuffer()
  res.send(Buffer.from(buf))
}

/**
 * Serves a user's avatar: uploaded file from disk if it exists, otherwise
 * DiceBear pixel-art so the UI never shows a broken image when the DB still
 * points at a missing file (e.g. ephemeral disk after redeploy).
 */
export async function getAvatarForUser(req: Request, res: Response) {
  const userId = param(req.params.userId)
  if (!userId || userId.length > 200) {
    return res.status(400).json({ message: 'Invalid user id' })
  }

  try {
    const result = await db.execute(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    const row = result.rows[0] as { avatar_url?: string | null }
    const avatarUrl = row.avatar_url ?? null

    if (!avatarUrl || avatarUrl === '') {
      await streamDiceBearPng(res, userId)
      return
    }

    if (avatarUrl.startsWith('http')) {
      return res.redirect(302, avatarUrl)
    }

    if (avatarUrl.startsWith('/uploads/')) {
      const rel = avatarUrl.replace(/^\/uploads\//, '')
      const abs = path.resolve(path.join(uploadsRoot, rel))
      const rootResolved = path.resolve(uploadsRoot)
      const relativeToRoot = path.relative(rootResolved, abs)
      if (
        relativeToRoot.startsWith('..') ||
        path.isAbsolute(relativeToRoot)
      ) {
        return res.status(400).json({ message: 'Invalid path' })
      }
      if (!rel || rel.endsWith('/') || rel.endsWith(path.sep)) {
        await streamDiceBearPng(res, userId)
        return
      }
      try {
        if (!fs.existsSync(abs)) {
          await streamDiceBearPng(res, userId)
          return
        }
        const st = fs.statSync(abs)
        if (!st.isFile()) {
          await streamDiceBearPng(res, userId)
          return
        }
        const buf = await fs.promises.readFile(abs)
        res.set('Cache-Control', 'public, max-age=604800')
        res.set('Content-Type', mimeForAvatarFile(abs))
        res.send(buf)
        return
      } catch (readErr) {
        console.error('avatar readFile', abs, readErr)
        await streamDiceBearPng(res, userId)
        return
      }
    }

    return res.status(404).json({ message: 'Unknown avatar format' })
  } catch (err) {
    console.error('getAvatarForUser error', err)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to load avatar' })
    }
  }
}
