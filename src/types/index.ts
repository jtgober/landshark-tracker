export type Member = {
  id: string
  name: string
  avatarColor: string
  status: 'in' | 'out'
  lastAction: string
  /** Avatar image URL (path like /uploads/avatars/… or full URL). Omitted for non-user members. */
  avatarUrl?: string | null
  /** When the user last updated their avatar (for cache-busting). */
  avatarUpdatedAt?: string | null
}

export type Activity = {
  id: string
  time: string
  description: string
  type: 'in' | 'out'
}

export type ClubEvent = {
  id: string
  name: string
  date: string
  time: string
  location: string
  type: 'cycling' | 'swimming' | 'running'
  description: string
}
