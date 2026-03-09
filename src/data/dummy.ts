import type { Member, Activity, ClubEvent } from '../types'

export const dummyMembers: Member[] = [
  {
    id: 'm1',
    name: 'Jordan Lee',
    avatarColor: '#ffb703',
    status: 'in',
    lastAction: 'Checked in 3 min ago',
  },
  {
    id: 'm2',
    name: 'Sam Patel',
    avatarColor: '#219ebc',
    status: 'out',
    lastAction: 'Checked out 20 min ago',
  },
  {
    id: 'm3',
    name: 'Alex Kim',
    avatarColor: '#ff6b6b',
    status: 'in',
    lastAction: 'Checked in 1 hr ago',
  },
]

export const dummyActivity: Activity[] = [
  {
    id: 'a1',
    time: '2:14 PM',
    description: 'Jordan checked in',
    type: 'in',
  },
  {
    id: 'a2',
    time: '1:58 PM',
    description: 'Sam checked out',
    type: 'out',
  },
  {
    id: 'a3',
    time: '1:20 PM',
    description: 'Alex checked in',
    type: 'out',
  },
]

export const dummyEvents: ClubEvent[] = [
  {
    id: 'e1',
    name: 'Sunrise Harbor Ride',
    date: 'Sat · Mar 21',
    time: '6:15 AM',
    location: 'Harbor Lot B → Coastal Loop',
    type: 'cycling',
    description: 'Easy-paced 30km coastal spin with coffee stop after.',
  },
  {
    id: 'e2',
    name: 'Open Water Swim Set',
    date: 'Tue · Mar 24',
    time: '5:45 PM',
    location: 'North Pier Beach',
    type: 'swimming',
    description: 'Buoy-to-buoy intervals with kayak support on the course.',
  },
  {
    id: 'e3',
    name: 'Track Session – 400s',
    date: 'Thu · Mar 26',
    time: '7:00 PM',
    location: 'Central Stadium Track',
    type: 'running',
    description: 'Warm up + 8 x 400m at 5K pace with full recovery.',
  },
]
