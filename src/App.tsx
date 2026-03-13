import { useMemo } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
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
  ThemeProvider,
  createTheme,
  BottomNavigation,
  BottomNavigationAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  Add,
  CheckCircle,
  DirectionsBike,
  DirectionsRun,
  Event as EventIcon,
  History,
  AdminPanelSettings,
  DarkMode,
  LightMode,
  Logout as LogoutIcon,
  Pool,
  Settings,
} from '@mui/icons-material'
import { useState, useEffect, useSyncExternalStore, lazy, Suspense } from 'react'

import type { Member, Activity, ClubEvent } from './types'

import { ActivityListCard } from './components/ActivityListCard'
import { EventsListCard } from './components/EventsListCard'
import { MainDrawer } from './components/MainDrawer'
import { API_URL, API_BASE } from './config'
import { useGpsTracking } from './hooks/useGpsTracking'

const AdminPanel = lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })))
const CreateEventDialog = lazy(() => import('./components/CreateEventDialog').then((m) => ({ default: m.CreateEventDialog })))
const EditEventDialog = lazy(() => import('./components/EditEventDialog').then((m) => ({ default: m.EditEventDialog })))
const EventAttendanceDialog = lazy(() => import('./components/EventAttendanceDialog').then((m) => ({ default: m.EventAttendanceDialog })))
const Login = lazy(() => import('./Login').then((m) => ({ default: m.Login })))
const UserSettingsDialog = lazy(() => import('./components/UserSettingsDialog').then((m) => ({ default: m.UserSettingsDialog })))

type ThemeMode = 'light' | 'dark'

function buildTheme(mode: ThemeMode) {
  const isDark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: {
        // WCAG-AA: #4db6ac on dark bg (#121212) = 7.4:1; on white = 3.2:1
        // We use a lighter teal in dark mode for AA compliance on dark surfaces
        main: isDark ? '#4db6ac' : '#006d77',
        contrastText: isDark ? '#000' : '#fff',
      },
      secondary: {
        main: isDark ? '#ffd54f' : '#ffb703',
      },
      background: {
        default: isDark ? '#121212' : '#f5f5f5',
        paper: isDark ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e0e0e0' : 'rgba(0, 0, 0, 0.87)',
        secondary: isDark ? '#aaaaaa' : 'rgba(0, 0, 0, 0.6)',
      },
      divider: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 999,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })
}

function useOnlineStatus() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
  )
}

function AppContent({ themeMode, onToggleTheme }: { themeMode: ThemeMode; onToggleTheme: () => void }) {
  const theme = useTheme()
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))
  const isOnline = useOnlineStatus()

  const [auth, setAuth] = useState<{
    token: string
    email: string
    userId: string
    role: string
  } | null>(() => {
    const token = localStorage.getItem('authToken')
    const email = localStorage.getItem('authEmail')
    const userId = localStorage.getItem('authUserId')
    const role = localStorage.getItem('authRole') || 'member'
    return token && email && userId ? { token, email, userId, role } : null
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
  const [editEventOpen, setEditEventOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [phonePromptOpen, setPhonePromptOpen] = useState(false)
  const [phonePromptValue, setPhonePromptValue] = useState('')
  const [namePromptValue, setNamePromptValue] = useState('')
  const [phonePromptSaving, setPhonePromptSaving] = useState(false)
  const [, setAvatarTick] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)

  const avatarStorageKey = auth?.userId ? `authAvatarUrl_${auth.userId}` : ''
  const versionStorageKey = auth?.userId ? `authAvatarVersion_${auth.userId}` : ''

  const storedAvatarPath =
    typeof window !== 'undefined' && avatarStorageKey
      ? localStorage.getItem(avatarStorageKey) || undefined
      : undefined

  const storedAvatarVersion =
    typeof window !== 'undefined' && versionStorageKey
      ? localStorage.getItem(versionStorageKey) || undefined
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
  const gps = useGpsTracking(auth?.token ?? null)

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
      setAuth({ token, email, userId, role: 'member' })
    }

    window.history.replaceState(null, '', '/')
  }, [])

  useEffect(() => {
    if (!auth) return

    const headers = {
      Authorization: `Bearer ${auth.token}`,
    }

    // Sync current user's profile (avatar) from server so nav/settings show the right avatar per user
    fetch(`${API_URL}/auth/me`, { headers })
      .then(res => (res.ok ? res.json() : null))
      .then(
        (
          profile:
            | {
                email?: string
                avatarUrl?: string
                avatarUpdatedAt?: string
                phone?: string
                displayName?: string
                role?: string
              }
            | null,
        ) => {
          if (!profile || !auth?.userId) return
          if (profile.email) localStorage.setItem('authEmail', profile.email)
          if (profile.phone !== undefined) {
            localStorage.setItem(`authPhone_${auth.userId}`, profile.phone ?? '')
          }
          if (profile.displayName !== undefined) {
            localStorage.setItem(`authDisplayName_${auth.userId}`, profile.displayName ?? '')
          }
          if (profile.role && profile.role !== auth.role) {
            localStorage.setItem('authRole', profile.role)
            setAuth((prev) => prev ? { ...prev, role: profile.role! } : prev)
          }
          // Prompt for display name + phone if either is missing
          if (
            (!profile.displayName || !profile.phone) &&
            !sessionStorage.getItem('phonePromptDismissed')
          ) {
            setPhonePromptOpen(true)
          }
          if (profile.avatarUrl != null) {
            localStorage.setItem(
              `authAvatarUrl_${auth.userId}`,
              profile.avatarUrl,
            )
            localStorage.setItem(
              `authAvatarVersion_${auth.userId}`,
              profile.avatarUpdatedAt ?? Date.now().toString(),
            )
            setAvatarTick(t => t + 1)
          }
        },
      )
      .catch(() => {})

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

      // Auto-open event from ?event= query param (QR code deep link)
      const params = new URLSearchParams(window.location.search)
      const eventParam = params.get('event')
      if (eventParam) {
        const match = eventsData.find((e: ClubEvent) => e.id === eventParam)
        if (match) setActiveEvent(match)
        window.history.replaceState({}, '', window.location.pathname)
      }
    })
  }, [auth, dataVersion])

  const [newEventOpen, setNewEventOpen] = useState(false)
  const [newEventDraft, setNewEventDraft] = useState<Omit<ClubEvent, 'id'>>({
    name: '',
    date: '',
    time: '',
    location: '',
    location_url: undefined,
    course_map_url: undefined,
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

    // Start/stop GPS tracking when the current user toggles their own status
    if (currentUserMemberId && memberId === currentUserMemberId) {
      if (nextEventStatus === 'in') {
        gps.start()
      } else {
        gps.stop()
      }
    }

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
    if (!trimmedName || !auth) return

    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          ...newEventDraft,
          name: trimmedName,
          locationUrl: newEventDraft.location_url || undefined,
          courseMapUrl: newEventDraft.course_map_url || undefined,
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
        location_url: undefined,
        course_map_url: undefined,
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

    gps.stop()

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

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? data?.error ?? 'Failed to delete event')
      }

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

  const handleRequestEditActiveEvent = () => {
    if (!activeEvent) return
    setEditEventOpen(true)
  }

  const handleSaveEditEvent = async (data: Omit<ClubEvent, 'id'>) => {
    if (!auth || !activeEvent) return

    try {
      const res = await fetch(`${API_URL}/events/${activeEvent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          name: data.name,
          date: data.date,
          time: data.time,
          location: data.location,
          locationUrl: data.location_url ?? null,
          courseMapUrl: data.course_map_url ?? null,
          type: data.type,
          description: data.description,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Failed to update event')
      }

      const updated = await res.json()

      setEvents((prev) =>
        prev.map((e) => (e.id === activeEvent.id ? updated : e)),
      )
      setActiveEvent(updated)
    } catch (err) {
      console.error('Failed to update event', err)
      throw err
    }
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
    localStorage.removeItem('authRole')
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
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <CircularProgress />
          </Box>
        }
      >
        <Login
          onAuthSuccess={({
          token,
          email,
          userId,
          role,
        }: {
          token: string
          email: string
          userId: string
          role?: string
        }) => {
          const userRole = role || 'member'
          localStorage.setItem('authToken', token)
          localStorage.setItem('authEmail', email)
          localStorage.setItem('authUserId', userId)
          localStorage.setItem('authRole', userRole)
          setAuth({ token, email, userId, role: userRole })
        }}
        />
      </Suspense>
    )
  }

  return (
    <Box
      sx={{
        minHeight: { xs: '100dvh', md: '100vh' },
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!isOnline && (
        <Box
          sx={{
            bgcolor: '#ff9800',
            color: '#fff',
            textAlign: 'center',
            py: 0.5,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          You're offline — showing cached data
        </Box>
      )}

      {showAdmin && (
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
              <CircularProgress />
            </Box>
          }
        >
          <AdminPanel auth={auth} onBack={() => setShowAdmin(false)} />
        </Suspense>
      )}

      {!showAdmin && (<>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: themeMode === 'dark'
            ? 'linear-gradient(135deg, #1a3a3a, #0d2626 60%)'
            : 'radial-gradient(circle at top left, #00b4d8, #006d77 60%)',
        }}
      >
        <Toolbar sx={{ minHeight: 68 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box
              component="img"
              src="/landsharks-logo.png"
              alt="Louisville Landsharks"
              sx={{
                width: 50,
                height: 50,
                mr: 1.5,
                borderRadius: '25%',
                bgcolor: 'transparent',
                p: 0.5,
                boxShadow: 'none',
                objectFit: 'contain',
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, letterSpacing: 0.2 }}
              >
                Shark Tracker
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.9 }}>
                <Pool sx={{ fontSize: 20 }} />
                <DirectionsBike sx={{ fontSize: 20 }} />
                <DirectionsRun sx={{ fontSize: 20 }} />
              </Stack>
            </Box>
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
            onClick={handleOpenUserMenu}
            sx={{ ml: 1, p: 0 }}
            size="small"
          >
            <Avatar
              src={userAvatarUrl}
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'secondary.main',
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
          <Settings sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
          User settings
        </MenuItem>
        <MenuItem
          onClick={() => {
            onToggleTheme()
          }}
        >
          {themeMode === 'dark' ? (
            <LightMode sx={{ mr: 1, fontSize: 20, color: 'secondary.main' }} />
          ) : (
            <DarkMode sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
          )}
          {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
        </MenuItem>
        {auth.role === 'admin' && (
          <MenuItem
            onClick={() => {
              handleCloseUserMenu()
              setShowAdmin(true)
            }}
          >
            <AdminPanelSettings sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
            Admin Panel
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1, fontSize: 20, color: 'error.main' }} />
          Log out
        </MenuItem>
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
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0,0,0,0.4)'
                  : '0 18px 45px rgba(15, 76, 92, 0.12), 0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'background.paper',
                    color: 'primary.main',
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
                  Event dashboard
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
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
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

      <Suspense fallback={null}>
        <CreateEventDialog
          open={newEventOpen}
          onClose={() => setNewEventOpen(false)}
          draft={newEventDraft}
          onChange={setNewEventDraft}
          onCreate={handleCreateEvent}
        />

        <EditEventDialog
          open={editEventOpen}
          event={activeEvent}
          onClose={() => setEditEventOpen(false)}
          onSave={handleSaveEditEvent}
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
        onEditEvent={handleRequestEditActiveEvent}
        authToken={auth.token}
        currentUserId={auth.userId}
        />

        <UserSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          auth={auth}
          avatarUrl={userAvatarUrl}
          phone={
            auth?.userId
              ? localStorage.getItem(`authPhone_${auth.userId}`) ?? ''
              : ''
          }
          displayName={
            auth?.userId
              ? localStorage.getItem(`authDisplayName_${auth.userId}`) ?? ''
              : ''
          }
          onAuthUpdate={(next) => {
            setAuth((prev) =>
              prev
                ? {
                    ...prev,
                    email: next.email ?? prev.email,
                  }
                : prev
            )
            if (next.email) {
              localStorage.setItem('authEmail', next.email)
            }
            if (next.phone !== undefined && auth?.userId) {
              localStorage.setItem(`authPhone_${auth.userId}`, next.phone)
            }
            if (next.displayName !== undefined && auth?.userId) {
              localStorage.setItem(`authDisplayName_${auth.userId}`, next.displayName)
              setDataVersion(v => v + 1)
            }
            if (next.avatarUrl && auth?.userId) {
              localStorage.setItem(`authAvatarUrl_${auth.userId}`, next.avatarUrl)
              localStorage.setItem(
                `authAvatarVersion_${auth.userId}`,
                next.avatarUpdatedAt ?? Date.now().toString(),
              )
              setAvatarTick(t => t + 1)
              setDataVersion(v => v + 1)
            }
          }}
        />
      </Suspense>

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

      <Dialog
        open={phonePromptOpen}
        onClose={() => {
          sessionStorage.setItem('phonePromptDismissed', '1')
          setPhonePromptOpen(false)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Welcome! Set up your profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tell us your name and phone number so other event members can
            identify and reach you. You can always change these later in Account
            settings.
          </Typography>
          <Stack spacing={2}>
            <TextField
              autoFocus
              label="Display name"
              fullWidth
              placeholder="e.g. Jonathan Gober"
              value={namePromptValue}
              onChange={(e) => setNamePromptValue(e.target.value)}
            />
            <TextField
              label="Phone number"
              type="tel"
              fullWidth
              placeholder="+1 (555) 123-4567"
              value={phonePromptValue}
              onChange={(e) => setPhonePromptValue(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              sessionStorage.setItem('phonePromptDismissed', '1')
              setPhonePromptOpen(false)
            }}
          >
            Skip
          </Button>
          <Button
            variant="contained"
            disabled={
              (!namePromptValue.trim() && !phonePromptValue.trim()) ||
              phonePromptSaving
            }
            onClick={async () => {
              setPhonePromptSaving(true)
              const body: { displayName?: string; phone?: string } = {}
              if (namePromptValue.trim()) body.displayName = namePromptValue.trim()
              if (phonePromptValue.trim()) body.phone = phonePromptValue.trim()

              try {
                const res = await fetch(`${API_URL}/auth/me`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${auth.token}`,
                  },
                  body: JSON.stringify(body),
                })
                if (res.ok && auth.userId) {
                  if (body.phone) {
                    localStorage.setItem(`authPhone_${auth.userId}`, body.phone)
                  }
                  if (body.displayName) {
                    localStorage.setItem(`authDisplayName_${auth.userId}`, body.displayName)
                  }
                }
              } catch {
                // Silently fail — they can update later in settings
              }
              sessionStorage.setItem('phonePromptDismissed', '1')
              setPhonePromptSaving(false)
              setPhonePromptOpen(false)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      </>)}
    </Box>
  )
}

function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode | null
    return saved || (prefersDark ? 'dark' : 'light')
  })

  const theme = useMemo(() => buildTheme(themeMode), [themeMode])

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('themeMode', next)
      return next
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent themeMode={themeMode} onToggleTheme={toggleTheme} />
    </ThemeProvider>
  )
}

export default App
