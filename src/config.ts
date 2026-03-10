/**
 * API base URL (no trailing slash). In production set VITE_API_URL to your backend URL.
 */
const raw =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:3001'
export const API_BASE = raw ? raw.replace(/\/+$/, '') : raw

export const API_URL = `${API_BASE}/api`
