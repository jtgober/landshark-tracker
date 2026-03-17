import { API_URL } from '../config'

const SHORT_MAP_DOMAINS = ['maps.app.goo.gl', 'goo.gl']

export function isShortMapUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return SHORT_MAP_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

/** Resolve short map URLs (e.g. maps.app.goo.gl/xxx) to full URL with coordinates */
export async function resolveShortMapUrl(url: string): Promise<string> {
  if (!isShortMapUrl(url)) return url
  const res = await fetch(
    `${API_URL}/maps/resolve?url=${encodeURIComponent(url)}`,
  )
  if (!res.ok) throw new Error('Failed to resolve map link')
  const data = (await res.json()) as { url?: string }
  return data.url ?? url
}

function parsePair(match: RegExpMatchArray | null): { lat: number; lng: number } | null {
  if (!match) return null
  const lat = parseFloat(match[1])
  const lng = parseFloat(match[2])
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/** Extract lat,lng from Google Maps or Apple Maps URLs when possible */
export function parseCoordsFromMapUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Google directions: !1dlng!2dlat — destination coords (prefer over @ map center)
    const dirMatch = url.match(/!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/)
    if (dirMatch) {
      const lng = parseFloat(dirMatch[1])
      const lat = parseFloat(dirMatch[2])
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }

    // Google: @lat,lng or @lat,lng,zoom (map center — avoid for directions URLs)
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:[,/]|z|$)/i)
    if (atMatch) return parsePair(atMatch)

    // Google place: !3dlat!4dlng (may have other ! segments between)
    const dMatch = url.match(/!3d(-?\d+\.?\d*)[^!]*!4d(-?\d+\.?\d*)/)
    if (dMatch) return parsePair(dMatch)

    // ll=lat,lng (Google/Apple)
    const llMatch = url.match(/(?:[?&])ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (llMatch) return parsePair(llMatch)

    // q=lat,lng or query=lat,lng (Google)
    const qMatch = url.match(/(?:[?&])(?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)(?:&|$)/)
    if (qMatch) return parsePair(qMatch)

    // sll=lat,lng (Apple search center)
    const sllMatch = url.match(/(?:[?&])sll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (sllMatch) return parsePair(sllMatch)

    // Fallback: first lat,lng pair that looks like valid coords
    const pairMatch = url.match(/(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (pairMatch) return parsePair(pairMatch)
  } catch {
    /* ignore */
  }
  return null
}

/** Extract address from Google Maps place URL path (e.g. /place/Yellow+Lot,+1401+River+Rd,...) */
export function extractAddressFromPlaceUrl(url: string): string | null {
  try {
    const m = url.match(/\/place\/([^/]+)(?:\/|$|\?)/)
    if (!m) return null
    const decoded = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim()
    return decoded.length > 0 ? decoded : null
  } catch {
    return null
  }
}

/** Geocode an address via Nominatim; tries full address first, then street part if empty */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const tryGeocode = async (q: string) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SharkTracker/1.0 (event location preview)',
        },
      }
    )
    const data = (await res.json()) as { lat: string; lon: string }[]
    return data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null
  }
  const result = await tryGeocode(address)
  if (result) return result
  // "Place Name, 123 Street, City" -> try "123 Street, City"
  const afterFirstComma = address.replace(/^[^,]+,?\s*/, '').trim()
  if (afterFirstComma && afterFirstComma !== address) return tryGeocode(afterFirstComma)
  return null
}
