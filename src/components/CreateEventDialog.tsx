import {
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

export function CreateEventDialog(props: {
  open: boolean
  onClose: () => void
  draft: Omit<ClubEvent, 'id'>
  onChange: (draft: Omit<ClubEvent, 'id'>) => void
  onCreate: () => void
}) {
  const { open, onClose, draft, onChange, onCreate } = props

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create new event</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Event name"
            fullWidth
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Date"
              placeholder="e.g. Sat · Apr 4"
              fullWidth
              value={draft.date}
              onChange={(e) => onChange({ ...draft, date: e.target.value })}
            />
            <TextField
              label="Time"
              placeholder="e.g. 6:15 AM"
              fullWidth
              value={draft.time}
              onChange={(e) => onChange({ ...draft, time: e.target.value })}
            />
          </Stack>
          <TextField
            label="Location"
            fullWidth
            placeholder="e.g. Harbor Lot B"
            value={draft.location}
            onChange={(e) => onChange({ ...draft, location: e.target.value })}
          />
          <TextField
            label="Location link (optional)"
            fullWidth
            placeholder="https://maps.google.com/... or maps.app.goo.gl/..."
            value={draft.location_url ?? ''}
            onChange={(e) =>
              onChange({ ...draft, location_url: e.target.value.trim() || undefined })
            }
            helperText="Paste a Google Maps link or mobile share link (maps.app.goo.gl) for directions"
          />
          <TextField
            label="Course map (optional)"
            fullWidth
            placeholder="e.g. https://ridewithgps.com/routes/54151690"
            value={draft.course_map_url ?? ''}
            onChange={(e) =>
              onChange({ ...draft, course_map_url: e.target.value.trim() || undefined })
            }
            helperText="Link to route map (RideWithGPS, Strava, etc.) for participants"
          />
          <TextField
            select
            label="Type"
            fullWidth
            value={draft.type}
            onChange={(e) =>
              onChange({ ...draft, type: e.target.value as ClubEvent['type'] })
            }
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
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onCreate}
          disabled={!draft.name.trim()}
        >
          Create & open
        </Button>
      </DialogActions>
    </Dialog>
  )
}
