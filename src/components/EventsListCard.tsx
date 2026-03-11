import { useState } from 'react'
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import {
  DirectionsBike,
  DirectionsRun,
  Pool,
  QrCode2,
  Close,
} from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import type { ClubEvent } from '../types'

export function EventsListCard(props: {
  events: ClubEvent[]
  onSelect: (event: ClubEvent) => void
}) {
  const { events, onSelect } = props
  const [qrEvent, setQrEvent] = useState<ClubEvent | null>(null)

  const eventUrl = (eventId: string) => {
    const base = window.location.origin
    return `${base}?event=${eventId}`
  }

  const typeIcon = (type: ClubEvent['type']) => {
    if (type === 'cycling') return <DirectionsBike fontSize="small" />
    if (type === 'swimming') return <Pool fontSize="small" />
    return <DirectionsRun fontSize="small" />
  }

  const typeLabel = (type: ClubEvent['type']) => {
    if (type === 'cycling') return 'Cycling'
    if (type === 'swimming') return 'Swimming'
    return 'Running'
  }

  const chipColors = (type: ClubEvent['type']) => {
    if (type === 'cycling')
      return { bgcolor: 'rgba(46, 125, 50, 0.10)', color: '#2e7d32' }
    if (type === 'swimming')
      return { bgcolor: 'rgba(2, 119, 189, 0.10)', color: '#0277bd' }
    return { bgcolor: 'rgba(198, 40, 40, 0.10)', color: '#c62828' }
  }

  return (
    <Stack spacing={1.5}>
      {events.map((evt) => (
        <Paper
          key={evt.id}
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            cursor: 'pointer',
            '&:active': { transform: 'scale(0.997)' },
          }}
          onClick={() => onSelect(evt)}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor:
                  evt.type === 'cycling'
                    ? 'rgba(46, 125, 50, 0.10)'
                    : evt.type === 'swimming'
                      ? 'rgba(3, 169, 244, 0.12)'
                      : 'rgba(244, 67, 54, 0.1)',
                color:
                  evt.type === 'cycling'
                    ? '#2e7d32'
                    : evt.type === 'swimming'
                      ? '#0277bd'
                      : '#c62828',
              }}
            >
              {typeIcon(evt.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, fontSize: 15 }}
                noWrap
              >
                {evt.name}
              </Typography>
              {(evt.date || evt.time) && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 13.5 }}
                >
                  {evt.date} · {evt.time}
                </Typography>
              )}
              {evt.location && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 13 }}
                >
                  {evt.location}
                </Typography>
              )}
              {evt.description && (
                <Typography variant="body2" sx={{ mt: 0.25, fontSize: 13.5 }}>
                  {evt.description}
                </Typography>
              )}
            </Box>
            <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0, width: 80 }}>
              <Chip
                size="small"
                label={typeLabel(evt.type)}
                sx={{
                  height: 24,
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  ...chipColors(evt.type),
                }}
              />
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  setQrEvent(evt)
                }}
                sx={{ p: 0.75 }}
              >
                <QrCode2 sx={{ fontSize: 28, color: 'text.secondary' }} />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      ))}

      <Dialog
        open={Boolean(qrEvent)}
        onClose={() => setQrEvent(null)}
        maxWidth="xs"
        fullWidth
      >
        {qrEvent && (
          <>
            <DialogTitle sx={{ pr: 5 }}>
              {qrEvent.name}
              <IconButton
                onClick={() => setQrEvent(null)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
                <QRCodeSVG
                  value={eventUrl(qrEvent.id)}
                  size={200}
                  level="M"
                  includeMargin
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 13, textAlign: 'center' }}
                >
                  Scan to open this event
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: 11,
                    wordBreak: 'break-all',
                    textAlign: 'center',
                    opacity: 0.7,
                  }}
                >
                  {eventUrl(qrEvent.id)}
                </Typography>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Stack>
  )
}
