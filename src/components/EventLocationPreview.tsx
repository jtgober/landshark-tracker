import { useEffect, useState } from 'react'
import { Box, Link, Stack, Typography } from '@mui/material'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OpenInNew } from '@mui/icons-material'
import { fetchCoordinatesFromMapUrl, geocodeLocationText, parseCoordsFromMapUrl } from '../utils/mapCoords'

/** Heuristic: location has comma or digits (street number) — avoid geocoding vague names like "Yellow Lot" */
function looksLikeAddress(s: string): boolean {
  return /,/.test(s) || /\d/.test(s)
}

// Fix Leaflet default icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type Props = {
  location: string
  locationUrl?: string | null
}

function CenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 15)
  }, [map, lat, lng])
  return null
}

/** Fix Leaflet not rendering in dialogs on mobile — invalidateSize when container is ready */
function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
    }, 100)
    return () => clearTimeout(t)
  }, [map])
  return null
}

export function EventLocationPreview({ location, locationUrl }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!location?.trim() && !locationUrl?.trim()) {
      queueMicrotask(() => setLoading(false))
      return () => { cancelled = true }
    }
    queueMicrotask(() => {
      setLoading(true)
      setError(false)
    })

    // When we have a location_url, use ONLY the URL for coordinates — never geocode.
    // Nominatim can return results biased by the user's IP, which would show "my location"
    // instead of the actual meeting place.
    if (locationUrl?.trim()) {
      const url = locationUrl.trim()
      const fromUrl = parseCoordsFromMapUrl(url)
      if (fromUrl) {
        queueMicrotask(() => {
          if (!cancelled) {
            setCoords(fromUrl)
            setLoading(false)
          }
        })
        return () => { cancelled = true }
      }
      // No coords in URL: use backend (resolve + geocode) — avoids CORS in production
      fetchCoordinatesFromMapUrl(url)
        .then((parsed) => {
          if (!cancelled) {
            if (parsed) {
              setCoords(parsed)
            } else if (location?.trim() && looksLikeAddress(location.trim())) {
              // Fallback: geocode only when location looks like a full address (avoids wrong pin for vague names like "Yellow Lot")
              geocodeLocationText(location.trim())
                .then((fallback) => {
                  if (!cancelled) {
                    setCoords(fallback)
                    setLoading(false)
                  }
                })
                .catch(() => {
                  if (!cancelled) {
                    setCoords(null)
                    setError(true)
                    setLoading(false)
                  }
                })
              return
            } else {
              setCoords(null)
              setError(true)
            }
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled && location?.trim() && looksLikeAddress(location.trim())) {
            geocodeLocationText(location.trim())
              .then((fallback) => {
                if (!cancelled) {
                  setCoords(fallback)
                  setLoading(false)
                }
              })
              .catch(() => {
                if (!cancelled) {
                  setCoords(null)
                  setError(true)
                  setLoading(false)
                }
              })
          } else if (!cancelled) {
            setCoords(null)
            setError(true)
            setLoading(false)
          }
        })
      return () => { cancelled = true }
    }

    // No location_url: geocode the location text via Nominatim
    const controller = new AbortController()
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location?.trim() ?? '')}&limit=1`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SharkTracker/1.0 (event location preview)',
        },
        signal: controller.signal,
      }
    )
      .then((res) => res.json())
      .then((data: { lat: string; lon: string }[]) => {
        if (!cancelled) {
          if (data.length > 0) {
            setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
          } else {
            setCoords(null)
            setError(true)
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoords(null)
          setError(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [location, locationUrl])

  if (!location?.trim() && !locationUrl?.trim()) return null

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
        Starting location
      </Typography>
      <Stack spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          {location}
        </Typography>
        {locationUrl && (
          <Link
            href={locationUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontSize: 13 }}
          >
            <OpenInNew sx={{ fontSize: 14 }} />
            Open in Maps
          </Link>
        )}
      </Stack>
      {loading && (
        <Box sx={{ height: 180, bgcolor: 'action.hover', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">Loading map…</Typography>
        </Box>
      )}
      {!loading && coords && (
        <Box sx={{ height: 180, minHeight: 180, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <CenterMap lat={coords.lat} lng={coords.lng} />
            <MapResizeFix />
            <Marker position={[coords.lat, coords.lng]}>
              <Popup>{location?.trim() || 'Event location'}</Popup>
            </Marker>
          </MapContainer>
        </Box>
      )}
      {!loading && error && (
        <Typography variant="caption" color="text.secondary">
          {locationUrl
            ? "Could not parse map link — use 'Open in Maps' for directions"
            : 'Could not find location on map'}
        </Typography>
      )}
    </Box>
  )
}
