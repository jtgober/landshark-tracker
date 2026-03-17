import { Request, Response } from 'express'
import {
  extractAddressFromPlaceUrl,
  geocodeAddress,
  parseCoordsFromMapUrl,
  unwrapGoogleSorryUrl,
} from '../utils/mapCoords'

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
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    let resolved = response.url || url
    resolved = unwrapGoogleSorryUrl(resolved)
    if (resolved && resolved !== url) {
      return res.json({ url: resolved })
    }
    return res.json({ url })
  } catch (err) {
    console.error('resolveMapUrl error', err)
    return res.status(502).json({ error: 'Failed to resolve map link' })
  }
}

const ALLOWED_MAP_DOMAINS = [
  'maps.app.goo.gl',
  'goo.gl',
  'www.google.com',
  'google.com',
  'maps.google.com',
]

function isAllowedMapDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return ALLOWED_MAP_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

/**
 * Resolve URL + parse coords or geocode address. All external requests (Google, Nominatim)
 * run server-side to avoid CORS issues in production.
 */
export const getMapCoordinates = async (req: Request, res: Response) => {
  const raw = req.query.url
  const url = typeof raw === 'string' ? raw.trim() : ''

  if (!url) {
    return res.status(400).json({ error: 'url query parameter is required' })
  }

  if (!isAllowedMapDomain(url)) {
    return res.status(400).json({
      error: 'Only Google Maps links are allowed',
    })
  }

  try {
    let resolved = url
    if (ALLOWED_SHORT_DOMAINS.some((d) => {
      try {
        const host = new URL(url).hostname.toLowerCase()
        return host === d || host.endsWith('.' + d)
      } catch {
        return false
      }
    })) {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      resolved = response.url || url
    }

    // Google may return a "sorry" page; extract the real URL from continue= param
    resolved = unwrapGoogleSorryUrl(resolved)

    const coords = parseCoordsFromMapUrl(resolved)
    if (coords) return res.json(coords)

    const address = extractAddressFromPlaceUrl(resolved)
    if (!address) {
      return res.status(404).json({ error: 'Could not extract location from map link' })
    }

    const geocoded = await geocodeAddress(address)
    if (!geocoded) {
      return res.status(404).json({ error: 'Could not find location on map' })
    }
    return res.json(geocoded)
  } catch (err) {
    console.error('getMapCoordinates error', err)
    return res.status(502).json({ error: 'Failed to parse map link' })
  }
}
