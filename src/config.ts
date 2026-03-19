/**
 * API origin (no trailing slash).
 * - Set VITE_API_URL in production when the UI and API are on different hosts.
 * - In Vite dev we default to '' so requests use the same origin as the app; `vite.config`
 *   proxies /api and /uploads to the backend. That fixes <img src="..."> avatar loads
 *   that often break when pointed at localhost:3001 from localhost:5173 (ORB / extensions).
 */
const trimmed =
  (typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  ''

const raw =
  trimmed ||
  (typeof import.meta !== 'undefined' && import.meta.env.DEV
    ? ''
    : 'http://localhost:3001')

export const API_BASE = raw.replace(/\/+$/, '')

export const API_URL = API_BASE ? `${API_BASE}/api` : '/api'

/** Absolute or same-origin URL for paths under /api or /uploads (avoids broken // when base is empty). */
export function apiPublicUrl(pathWithQuery: string): string {
  const q = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`
  return API_BASE ? `${API_BASE}${q}` : q
}
