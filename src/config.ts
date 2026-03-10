/**
 * API base URL (no trailing slash). In production set VITE_API_URL to your backend URL.
 */
export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:3001'

export const API_URL = `${API_BASE}/api`
