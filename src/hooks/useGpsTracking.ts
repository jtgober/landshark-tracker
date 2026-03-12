import { useEffect, useRef, useCallback } from 'react'
import { API_URL } from '../config'

/**
 * Starts/stops browser geolocation tracking and pushes updates to the server.
 * Call `start()` when the user checks in and `stop()` when they check out.
 */
export function useGpsTracking(token: string | null) {
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  const sendLocation = useCallback(
    (lat: number, lng: number) => {
      if (!token) return
      fetch(`${API_URL}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lat, lng }),
      }).catch(() => {})
    },
    [token],
  )

  const start = useCallback(() => {
    if (!('geolocation' in navigator) || watchIdRef.current !== null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastCoordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        sendLocation(pos.coords.latitude, pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15_000 },
    )

    // Also push on a regular interval in case watchPosition fires infrequently
    intervalRef.current = setInterval(() => {
      if (lastCoordsRef.current) {
        sendLocation(lastCoordsRef.current.lat, lastCoordsRef.current.lng)
      }
    }, 60_000)
  }, [sendLocation])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    lastCoordsRef.current = null

    if (token) {
      fetch(`${API_URL}/location`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }, [token])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return { start, stop }
}
