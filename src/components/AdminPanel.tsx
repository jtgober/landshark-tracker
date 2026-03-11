import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  Delete,
  Edit,
  Shield,
  Person,
  Add,
  ArrowBack,
} from '@mui/icons-material'
import { API_URL } from '../config'

type User = {
  id: string
  email: string
  display_name?: string | null
  phone?: string | null
  role?: string
  avatar_url?: string | null
  created_at: string
}

type Event = {
  id: string
  name: string
  date: string
  time: string
  location: string
  type: string
  description: string
}

type Props = {
  auth: { token: string; email: string; userId: string; role: string }
  onBack: () => void
}

const EVENT_TYPES = ['cycling', 'swimming', 'running']

export function AdminPanel({ auth, onBack }: Props) {
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<{ type: 'user' | 'event'; id: string; name: string } | null>(null)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [createEventOpen, setCreateEventOpen] = useState(false)

  const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/users`, { headers })
      if (!res.ok) throw new Error('Failed to fetch users')
      setUsers(await res.json())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [auth.token])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/events`)
      if (!res.ok) throw new Error('Failed to fetch events')
      setEvents(await res.json())
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchUsers(), fetchEvents()]).finally(() => setLoading(false))
  }, [fetchUsers, fetchEvents])

  const handleDeleteUser = async (id: string) => {
    await fetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', headers })
    setDeleteDialog(null)
    fetchUsers()
  }

  const handleDeleteEvent = async (id: string) => {
    await fetch(`${API_URL}/events/${id}`, { method: 'DELETE', headers })
    setDeleteDialog(null)
    fetchEvents()
  }

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    await fetch(`${API_URL}/auth/users/${user.id}/role`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role: newRole }),
    })
    fetchUsers()
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 2, px: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          Admin Panel
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab label={`Users (${users.length})`} />
        <Tab label={`Events (${events.length})`} />
      </Tabs>

      {tab === 0 && (
        <UsersTable
          users={users}
          currentUserId={auth.userId}
          onToggleRole={handleToggleRole}
          onDelete={(u) => setDeleteDialog({ type: 'user', id: u.id, name: u.email })}
        />
      )}

      {tab === 1 && (
        <EventsTable
          events={events}
          onEdit={(e) => setEditEvent(e)}
          onDelete={(e) => setDeleteDialog({ type: 'event', id: e.id, name: e.name })}
          onCreate={() => setCreateEventOpen(true)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialog?.name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!deleteDialog) return
              if (deleteDialog.type === 'user') handleDeleteUser(deleteDialog.id)
              else handleDeleteEvent(deleteDialog.id)
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit event dialog */}
      <EventFormDialog
        open={!!editEvent}
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onSave={async (data) => {
          if (!editEvent) return
          await fetch(`${API_URL}/events/${editEvent.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
          })
          setEditEvent(null)
          fetchEvents()
        }}
      />

      {/* Create event dialog */}
      <EventFormDialog
        open={createEventOpen}
        event={null}
        onClose={() => setCreateEventOpen(false)}
        onSave={async (data) => {
          await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
          })
          setCreateEventOpen(false)
          fetchEvents()
        }}
      />
    </Box>
  )
}

function UsersTable({
  users,
  currentUserId,
  onToggleRole,
  onDelete,
}: {
  users: User[]
  currentUserId: string
  onToggleRole: (u: User) => void
  onDelete: (u: User) => void
}) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 13 } }}>
            <TableCell>User</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Joined</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId
            return (
              <TableRow key={u.id} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar
                      src={u.avatar_url ?? undefined}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
                    >
                      {(u.display_name || u.email).charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                        {u.display_name || u.email.split('@')[0]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {u.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={u.role === 'admin' ? <Shield sx={{ fontSize: 14 }} /> : <Person sx={{ fontSize: 14 }} />}
                    label={u.role || 'member'}
                    color={u.role === 'admin' ? 'primary' : 'default'}
                    variant={u.role === 'admin' ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, fontSize: 12 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                    {u.phone || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <Tooltip title={isSelf ? "Can't change own role" : u.role === 'admin' ? 'Demote to member' : 'Promote to admin'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={isSelf}
                          onClick={() => onToggleRole(u)}
                          color={u.role === 'admin' ? 'primary' : 'default'}
                        >
                          <Shield fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={isSelf ? "Can't delete yourself" : 'Delete user'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={isSelf}
                          onClick={() => onDelete(u)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No users found</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function EventsTable({
  events,
  onEdit,
  onDelete,
  onCreate,
}: {
  events: Event[]
  onEdit: (e: Event) => void
  onDelete: (e: Event) => void
  onCreate: () => void
}) {
  const chipColor = (type: string) => {
    switch (type) {
      case 'cycling': return 'success' as const
      case 'swimming': return 'info' as const
      case 'running': return 'error' as const
      default: return 'default' as const
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Button variant="contained" startIcon={<Add />} onClick={onCreate} size="small">
          Create Event
        </Button>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 13 } }}>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id} sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 180 }}>
                    {e.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={e.type} color={chipColor(e.type)} sx={{ fontWeight: 600, fontSize: 12 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                    {e.date || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                    {e.time || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160, fontSize: 13 }}>
                    {e.location || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    <Tooltip title="Edit event">
                      <IconButton size="small" onClick={() => onEdit(e)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete event">
                      <IconButton size="small" color="error" onClick={() => onDelete(e)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No events found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}

function EventFormDialog({
  open,
  event,
  onClose,
  onSave,
}: {
  open: boolean
  event: Event | null
  onClose: () => void
  onSave: (data: Omit<Event, 'id'>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('cycling')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (event) {
      setName(event.name)
      setDate(event.date)
      setTime(event.time)
      setLocation(event.location)
      setType(event.type)
      setDescription(event.description)
    } else {
      setName('')
      setDate('')
      setTime('')
      setLocation('')
      setType('cycling')
      setDescription('')
    }
  }, [event, open])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ name, date, time, location, type, description })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Event Name"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Type"
            select
            fullWidth
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {EVENT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date"
            fullWidth
            placeholder="e.g. Sat · Mar 21"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label="Time"
            fullWidth
            placeholder="e.g. 6:15 AM"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <TextField
            label="Location"
            fullWidth
            placeholder="e.g. Harbor Lot B"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          {event ? 'Save Changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
