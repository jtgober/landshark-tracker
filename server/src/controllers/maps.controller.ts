import { Request, Response } from 'express'

const ALLOWED_SHORT_DOMAINS = [
  'maps.app.goo.gl',
  'goo.gl',
  'maps.google.com',
  'www.google.com',
]

function isAllowedMapUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return ALLOWED_SHORT_DOMAINS.some(
      (d) => host === d || host.endsWith('.' + d),
    )
  } catch {
    return false
  }
}

/**
 * Resolve short map URLs (e.g. maps.app.goo.gl/xxx) to their full redirect target.
 * Used for mobile share links that don't contain coordinates in the URL.
 */
export const resolveMapUrl = async (req: Request, res: Response) => {
  const raw = req.query.url
  const url = typeof raw === 'string' ? raw.trim() : ''

  if (!url) {
    return res.status(400).json({ error: 'url query parameter is required' })
  }

  if (!isAllowedMapUrl(url)) {
    return res.status(400).json({
      error: 'Only Google Maps short links (maps.app.goo.gl, goo.gl) are allowed',
    })
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Shark-In/1.0 (map link resolver)',
      },
    })
    const resolved = response.url
    if (resolved && resolved !== url) {
      return res.json({ url: resolved })
    }
    return res.json({ url })
  } catch (err) {
    console.error('resolveMapUrl error', err)
    return res.status(502).json({ error: 'Failed to resolve map link' })
  }
}
