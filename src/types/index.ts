export type Member = {
  id: string
  name: string
  avatarColor: string
  status: 'in' | 'out'
  lastAction: string
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
