/** Parse lat,lng from a regex match */
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
    const dirMatch = url.match(/!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/)
    if (dirMatch) {
      const lng = parseFloat(dirMatch[1])
      const lat = parseFloat(dirMatch[2])
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }

    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:[,/]|z|$)/i)
    if (atMatch) return parsePair(atMatch)

    const dMatch = url.match(/!3d(-?\d+\.?\d*)[^!]*!4d(-?\d+\.?\d*)/)
    if (dMatch) return parsePair(dMatch)

    const llMatch = url.match(/(?:[?&])ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (llMatch) return parsePair(llMatch)

    const qMatch = url.match(/(?:[?&])(?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)(?:&|$)/)
    if (qMatch) return parsePair(qMatch)

    const sllMatch = url.match(/(?:[?&])sll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (sllMatch) return parsePair(sllMatch)

    const pairMatch = url.match(/(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (pairMatch) return parsePair(pairMatch)
  } catch {
    /* ignore */
  }
  return null
}

/** Extract address from Google Maps place URL path */
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

/** Geocode an address via Nominatim (server-side, no CORS) */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const tryGeocode = async (q: string) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Shark-In/1.0 (event location; +https://github.com/shark-in)',
        },
      }
    )
    const data = (await res.json()) as { lat: string; lon: string }[]
    return data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null
  }
  const result = await tryGeocode(address)
  if (result) return result
  const afterFirstComma = address.replace(/^[^,]+,?\s*/, '').trim()
  if (afterFirstComma && afterFirstComma !== address) return tryGeocode(afterFirstComma)
  return null
}
