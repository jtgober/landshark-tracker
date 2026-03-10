import { useEffect, useState, useRef } from 'react'
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API_URL } from '../config'

// Fix Leaflet's default icon paths (broken by bundlers)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type MemberLocation = {
  userId: string
  lat: number
  lng: number
  updatedAt: string
  name: string
  avatarColor: string
}

function createColorIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function FitBounds({ locations }: { locations: MemberLocation[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (locations.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(
        locations.map((l) => [l.lat, l.lng] as [number, number]),
      )
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      fitted.current = true
    }
  }, [locations, map])

  return null
}

function timeSince(dateStr: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

export function EventLocationMap({
  eventId,
  visible,
}: {
  eventId: string
  visible: boolean
}) {
  const [locations, setLocations] = useState<MemberLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible || !eventId) return

    let cancelled = false

    const fetchLocations = () => {
      fetch(`${API_URL}/location/event/${eventId}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: MemberLocation[]) => {
          if (!cancelled) {
            setLocations(data)
            setLoading(false)
            setError(null)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Failed to load locations')
            setLoading(false)
          }
        })
    }

    fetchLocations()
    const interval = setInterval(fetchLocations, 15_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [eventId, visible])

  if (!visible) return null

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ fontSize: 13 }}>
        {error}
      </Alert>
    )
  }

  if (locations.length === 0) {
    return (
      <Alert severity="info" sx={{ fontSize: 13 }}>
        No members are currently sharing their location for this event.
      </Alert>
    )
  }

  return (
    <Box
      sx={{
        height: 280,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <MapContainer
        center={[locations[0].lat, locations[0].lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds locations={locations} />
        {locations.map((loc) => (
          <Marker
            key={loc.userId}
            position={[loc.lat, loc.lng]}
            icon={createColorIcon(loc.avatarColor)}
          >
            <Popup>
              <strong>{loc.name}</strong>
              <br />
              Updated {timeSince(loc.updatedAt)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  )
}
