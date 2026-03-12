import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import type { ClubEvent } from '../types'

export function EditEventDialog(props: {
  open: boolean
  event: ClubEvent | null
  onClose: () => void
  onSave: (data: Omit<ClubEvent, 'id'>) => Promise<void>
}) {
  const { open, event, onClose, onSave } = props
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [courseMapUrl, setCourseMapUrl] = useState('')
  const [type, setType] = useState<ClubEvent['type']>('cycling')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (event) {
      setName(event.name)
      setDate(event.date)
      setTime(event.time)
      setLocation(event.location)
      setLocationUrl(event.location_url ?? '')
      setCourseMapUrl(event.course_map_url ?? '')
      setType(event.type)
      setDescription(event.description)
    }
  }, [event, open])

  const handleSave = async () => {
    if (!event) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name,
        date,
        time,
        location,
        location_url: locationUrl.trim() || undefined,
        course_map_url: courseMapUrl.trim() || undefined,
        type,
        description,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit event</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Event name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Date"
              placeholder="e.g. Sat · Apr 4"
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextField
              label="Time"
              placeholder="e.g. 6:15 AM"
              fullWidth
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Stack>
          <TextField
            label="Location"
            fullWidth
            placeholder="e.g. Harbor Lot B"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <TextField
            label="Location link (optional)"
            fullWidth
            placeholder="https://maps.google.com/... or maps.app.goo.gl/..."
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            helperText="Paste a Google Maps link or mobile share link (maps.app.goo.gl) for directions"
          />
          <TextField
            label="Course map (optional)"
            fullWidth
            placeholder="e.g. https://ridewithgps.com/routes/54151690"
            value={courseMapUrl}
            onChange={(e) => setCourseMapUrl(e.target.value)}
            helperText="Link to route map (RideWithGPS, Strava, etc.) for participants"
          />
          <TextField
            select
            label="Type"
            fullWidth
            value={type}
            onChange={(e) => setType(e.target.value as ClubEvent['type'])}
          >
            <MenuItem value="cycling">Cycling</MenuItem>
            <MenuItem value="swimming">Swimming</MenuItem>
            <MenuItem value="running">Running</MenuItem>
          </TextField>
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
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
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}
