import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  BottomNavigation,
  BottomNavigationAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Add,
  CheckCircle,
  Event as EventIcon,
  History,
  QrCodeScanner,
} from '@mui/icons-material'
import { useState, useEffect } from 'react'

import type { Member, Activity, ClubEvent } from './types'

import { ActivityListCard } from './components/ActivityListCard'
import { EventsListCard } from './components/EventsListCard'
import { MainDrawer } from './components/MainDrawer'
import { CreateEventDialog } from './components/CreateEventDialog'
import { EventAttendanceDialog } from './components/EventAttendanceDialog'
import { Login } from './Login.tsx'
import { UserSettingsDialog } from './components/UserSettingsDialog'
import { API_URL, API_BASE } from './config'

function App() {
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))

  const [auth, setAuth] = useState<{
    token: string
    email: string
    userId: string
  } | null>(() => {
    const token = localStorage.getItem('authToken')
    const email = localStorage.getItem('authEmail')
    const userId = localStorage.getItem('authUserId')
    return token && email && userId ? { token, email, userId } : null
  })

  const [tab, setTab] = useState(0) // 0 = Events, 1 = Activity
  const [members, setMembers] = useState<Member[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeEvent, setActiveEvent] = useState<ClubEvent | null>(null)
  const [attendance, setAttendance] = useState<
    Record<string, Record<string, 'in' | 'out'>>
  >({})
  const [myEventStatuses, setMyEventStatuses] = useState<
    Record<string, 'none' | 'out' | 'in'>
  >({})

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null,
  )
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const storedAvatarPath =
    typeof window !== 'undefined'
      ? localStorage.getItem('authAvatarUrl') || undefined
      : undefined

  const storedAvatarVersion =
    typeof window !== 'undefined'
      ? localStorage.getItem('authAvatarVersion') || undefined
      : undefined

  const userAvatarUrl =
    (storedAvatarPath && auth
      ? `${API_BASE}${storedAvatarPath}${
          storedAvatarVersion ? `?v=${storedAvatarVersion}` : ''
        }`
      : undefined) ||
    (auth
      ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(
          auth.email,
        )}&size=64`
      : '')

  const currentUserMemberId = auth ? `user-${auth.userId}` : undefined

  // Handle OAuth callback hash from Google/Facebook
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.pathname !== '/oauth/callback') return
    if (!window.location.hash.startsWith('#')) return

    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')
    const email = params.get('email')
    const userId = params.get('userId')

    if (token && email && userId) {
      localStorage.setItem('authToken', token)
      localStorage.setItem('authEmail', email)
      localStorage.setItem('authUserId', userId)
      setAuth({ token, email, userId })
    }

    window.history.replaceState(null, '', '/')
  }, [])

  useEffect(() => {
    if (!auth) return

    const headers = auth
      ? {
          Authorization: `Bearer ${auth.token}`,
        }
      : undefined

    Promise.all([
      fetch(`${API_URL}/members`).then(res => res.json()),
      fetch(`${API_URL}/events`).then(res => res.json()),
      fetch(`${API_URL}/activity`).then(res => res.json()),
      fetch(`${API_URL}/events/me`, { headers }).then(res =>
        res.ok ? res.json() : [],
      ),
    ]).then(([membersData, eventsData, activityData, myEventsData]) => {
      setMembers(membersData)
      setEvents(eventsData)
      setActivity(activityData)

      // Fetch attendance for all events
      const attendancePromises = eventsData.map((evt: ClubEvent) =>
        fetch(`${API_URL}/attendance/${evt.id}`).then(res => {
          if (!res.ok) return {}
          return res.json()
        }).catch(() => ({}))
      )
      
      Promise.all(attendancePromises).then((attendanceData) => {
        const attendanceMap: Record<string, Record<string, 'in' | 'out'>> = {}
        eventsData.forEach((evt: ClubEvent, index: number) => {
          attendanceMap[evt.id] = attendanceData[index] || {}
        })
        setAttendance(attendanceMap)
      })

      const statusMap: Record<string, 'none' | 'out' | 'in'> = {}
      if (Array.isArray(myEventsData)) {
        myEventsData.forEach((evt: ClubEvent & { userStatus?: string }) => {
          if (evt.id && evt.userStatus) {
            statusMap[evt.id] =
              evt.userStatus === 'in' || evt.userStatus === 'out'
                ? evt.userStatus
                : 'out'
          }
        })
      }
      setMyEventStatuses(statusMap)
    })
  }, [auth])

  const [newEventOpen, setNewEventOpen] = useState(false)
  const [newEventDraft, setNewEventDraft] = useState<Omit<ClubEvent, 'id'>>({
    name: '',
    date: '',
    time: '',
    location: '',
    type: 'cycling',
    description: '',
  })

  const handleToggleAttendance = async (memberId: string) => {
    if (!activeEvent) return

    const currentEventStatus =
      attendance[activeEvent.id]?.[memberId] ?? 'out'
    const nextEventStatus: 'in' | 'out' =
      currentEventStatus === 'in' ? 'out' : 'in'

    setAttendance((prev) => {
      const current = prev[activeEvent.id] ?? {}
      return {
        ...prev,
        [activeEvent.id]: {
          ...current,
          [memberId]: nextEventStatus,
        },
      }
    })

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              status: nextEventStatus,
              lastAction:
                nextEventStatus === 'in'
                  ? `${activeEvent.name} · Checked in just now`
                  : `${activeEvent.name} · Checked out just now`,
            }
          : m,
      ),
    )

    try {
      await fetch(`${API_URL}/attendance/${activeEvent.id}/toggle/${memberId}`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('Failed to toggle attendance:', err)
    }
  }

  const handleCreateEvent = async () => {
    const trimmedName = newEventDraft.name.trim()
    if (!trimmedName) return

    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newEventDraft,
          name: trimmedName,
        }),
      })

      if (!response.ok) throw new Error('Failed to create event')
      
      const newEvent = await response.json()

      setEvents((prev) => [newEvent, ...prev])

      setAttendance((prev) => ({
        ...prev,
        [newEvent.id]: {},
      }))

      setActiveEvent(newEvent)
      setNewEventOpen(false)
      setNewEventDraft({
        name: '',
        date: '',
        time: '',
        location: '',
        type: 'cycling',
        description: '',
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleJoinActiveEvent = async () => {
    if (!auth || !activeEvent) return

    try {
      const res = await fetch(`${API_URL}/events/${activeEvent.id}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })

      if (!res.ok) return

      const data = await res.json()

      setMyEventStatuses(prev => ({
        ...prev,
        [activeEvent.id]: 'out',
      }))

      if (data.member) {
        const member = data.member as Member

        setMembers(prev => {
          if (prev.some(m => m.id === member.id)) return prev
          return [...prev, member]
        })

        setAttendance(prev => ({
          ...prev,
          [activeEvent.id]: {
            ...(prev[activeEvent.id] ?? {}),
            [member.id]: 'out',
          },
        }))
      }
    } catch (err) {
      console.error('Failed to join event', err)
    }
  }

  const handleLeaveActiveEvent = async () => {
    if (!auth || !activeEvent) return

    try {
      const res = await fetch(`${API_URL}/events/${activeEvent.id}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })

      if (!res.ok) return

      setMyEventStatuses(prev => ({
        ...prev,
        [activeEvent.id]: 'none',
      }))

      // Refresh attendance for this event so the user disappears from the list
      const attendanceRes = await fetch(
        `${API_URL}/attendance/${activeEvent.id}`,
      )
      if (attendanceRes.ok) {
        const eventAttendance = await attendanceRes.json()
        setAttendance(prev => ({
          ...prev,
          [activeEvent.id]: eventAttendance,
        }))
      }
    } catch (err) {
      console.error('Failed to leave event', err)
    }
  }

  const handleDeleteActiveEvent = async () => {
    if (!auth || !activeEvent) return

    try {
      const res = await fetch(`${API_URL}/events/${activeEvent.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })

      if (!res.ok && res.status !== 204) return

      setEvents(prev => prev.filter(evt => evt.id !== activeEvent.id))
      setAttendance(prev => {
        const copy = { ...prev }
        delete copy[activeEvent.id]
        return copy
      })
      setMyEventStatuses(prev => {
        const copy = { ...prev }
        delete copy[activeEvent.id]
        return copy
      })
      setActiveEvent(null)
    } catch (err) {
      console.error('Failed to delete event', err)
    }
  }

  const handleRequestDeleteActiveEvent = () => {
    if (!activeEvent) return
    setDeleteConfirmOpen(true)
  }

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authEmail')
    localStorage.removeItem('authUserId')
    setAuth(null)
    setMembers([])
    setActivity([])
    setEvents([])
    setAttendance({})
    setMyEventStatuses({})
    setActiveEvent(null)
    setTab(0)
    handleCloseUserMenu()
  }

  if (!auth) {
    return (
      <Login
        onAuthSuccess={({
          token,
          email,
          userId,
        }: {
          token: string
          email: string
          userId: string
        }) => {
          localStorage.setItem('authToken', token)
          localStorage.setItem('authEmail', email)
          localStorage.setItem('authUserId', userId)
          setAuth({ token, email, userId })
        }}
      />
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background:
            'radial-gradient(circle at top left, #00b4d8, #006d77 60%)',
        }}
      >
        <Toolbar sx={{ minHeight: 68 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, letterSpacing: 0.2 }}
            >
              shark.in
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Cycling · Swimming · Running
            </Typography>
          </Box>
          <IconButton
            color="inherit"
            size="small"
            sx={{
              mr: 1,
              bgcolor: 'rgba(255,255,255,0.16)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
            }}
            onClick={() => setDrawerOpen(true)}
          >
            <EventIcon />
          </IconButton>
          <IconButton
            color="inherit"
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.16)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
            }}
          >
            <QrCodeScanner />
          </IconButton>
          <IconButton
            onClick={handleOpenUserMenu}
            sx={{ ml: 1, p: 0 }}
            size="small"
          >
            <Avatar
              src={userAvatarUrl}
              sx={{
                width: 32,
                height: 32,
                bgcolor: '#ffb703',
                border: '2px solid rgba(255,255,255,0.9)',
              }}
            >
              {auth.email.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleCloseUserMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {auth.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Signed in
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseUserMenu()
            setSettingsOpen(true)
          }}
        >
          User settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>Log out</MenuItem>
      </Menu>

      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          width: '100%',
          pb: isSmall ? 9 : 3,
          pt: 2,
        }}
      >
        <Stack spacing={2.2}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              p: 2,
              background:
                'linear-gradient(145deg, #e0fbfc, rgba(255,255,255,0.96))',
              border: '1px solid rgba(255,255,255,0.9)',
              boxShadow:
                '0 18px 45px rgba(15, 76, 92, 0.12), 0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 4,
                  bgcolor: 'rgba(0, 109, 119, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: '#ffffff',
                    color: '#006d77',
                    width: 40,
                    height: 40,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                  }}
                >
                  <CheckCircle />
                </Avatar>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, mb: 0.5, fontSize: 22 }}
                >
                  Event safety dashboard
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 13.5 }}
                >
                  Open an event to see who is out on course and who has checked
                  back in.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 999,
              px: 1,
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab
                icon={<EventIcon fontSize="small" />}
                iconPosition="start"
                label="Events"
                sx={{ minHeight: 44, fontSize: 13, fontWeight: 600 }}
              />
              <Tab
                icon={<History fontSize="small" />}
                iconPosition="start"
                label="Activity"
                sx={{ minHeight: 44, fontSize: 13, fontWeight: 600 }}
              />
            </Tabs>
          </Paper>

          {tab === 0 && (
            <Stack spacing={2}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Upcoming events
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setNewEventOpen(true)}
                  sx={{ borderRadius: 999 }}
                >
                  New event
                </Button>
              </Stack>
              <EventsListCard
                events={events}
                onSelect={(evt) => setActiveEvent(evt)}
              />
            </Stack>
          )}
          {tab === 1 && <ActivityListCard activity={activity} />}
        </Stack>
      </Container>

      {isSmall && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <BottomNavigation
            showLabels
            value={tab}
            onChange={(_, value) => setTab(value)}
          >
            <BottomNavigationAction label="Events" icon={<EventIcon />} />
            <BottomNavigationAction label="Activity" icon={<History />} />
          </BottomNavigation>
        </Paper>
      )}

      <MainDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <CreateEventDialog
        open={newEventOpen}
        onClose={() => setNewEventOpen(false)}
        draft={newEventDraft}
        onChange={setNewEventDraft}
        onCreate={handleCreateEvent}
      />

      <EventAttendanceDialog
        event={activeEvent}
        members={members}
        attendance={attendance}
        isSmall={isSmall}
        onClose={() => setActiveEvent(null)}
        onToggleAttendance={handleToggleAttendance}
        currentUserStatus={
          activeEvent
            ? myEventStatuses[activeEvent.id] ?? 'none'
            : undefined
        }
        onJoinEvent={handleJoinActiveEvent}
        onLeaveEvent={handleLeaveActiveEvent}
        currentUserMemberId={currentUserMemberId}
        currentUserAvatarUrl={userAvatarUrl}
        onDeleteEvent={handleRequestDeleteActiveEvent}
      />

      <Dialog
        open={deleteConfirmOpen && Boolean(activeEvent)}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete event?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently remove{' '}
            <strong>{activeEvent?.name}</strong> from your events and clear its
            attendance history.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              await handleDeleteActiveEvent()
              setDeleteConfirmOpen(false)
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <UserSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        auth={auth}
        avatarUrl={userAvatarUrl}
        onAuthUpdate={(next) => {
          setAuth((prev) =>
            prev
              ? {
                  ...prev,
                  email: next.email ?? prev.email,
                  // avatarUrl is handled via localStorage below
                }
              : prev,
          )
          if (next.email) {
            localStorage.setItem('authEmail', next.email)
          }
          if (next.avatarUrl) {
            localStorage.setItem('authAvatarUrl', next.avatarUrl)
            localStorage.setItem('authAvatarVersion', Date.now().toString())
          }
        }}
      />
    </Box>
  )
}

export default App
