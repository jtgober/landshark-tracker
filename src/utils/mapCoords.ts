import { API_URL } from '../config'

const MAP_DOMAINS = ['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com', 'maps.google.com']

function isMapUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return MAP_DOMAINS.some((d) => host === d || host.endsWith('.' + d))
  } catch {
    return false
  }
}

/** Fetch coordinates from map URL via backend (avoids CORS, works in production) */
export async function fetchCoordinatesFromMapUrl(
  url: string
): Promise<{ lat: number; lng: number } | null> {
  if (!isMapUrl(url)) return null
  const encoded = encodeURIComponent(url)
  const tryFetch = (base: string) =>
    fetch(`${base}/maps/coordinates?url=${encoded}`).then(async (res) => {
      if (!res.ok) return null
      const data = (await res.json()) as { lat?: number; lng?: number }
      return typeof data?.lat === 'number' && typeof data?.lng === 'number'
        ? { lat: data.lat, lng: data.lng }
        : null
    })
  try {
    const result = await tryFetch(API_URL)
    if (result) return result
  } catch {
    /* ignore */
  }
  // Retry same-origin when API may be proxied (e.g. /api -> backend)
  if (typeof window !== 'undefined') {
    const sameOrigin = `${window.location.origin}/api`
    if (sameOrigin !== API_URL) {
      try {
        return (await tryFetch(sameOrigin)) ?? null
      } catch {
        /* ignore */
      }
    }
  }
  return null
}

/** Geocode address text via Nominatim (client-side; may have CORS limits in production) */
export async function geocodeLocationText(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&viewbox=-125,24,-66,50`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SharkTracker/1.0 (event location preview)',
      },
    }
  )
  const data = (await res.json()) as { lat: string; lon: string }[]
  return data.length > 0
    ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    : null
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

