import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { DirectionsBike, DirectionsRun, Pool } from '@mui/icons-material'
import type { ClubEvent } from '../types'

export function EventsListCard(props: {
  events: ClubEvent[]
  onSelect: (event: ClubEvent) => void
}) {
  const { events, onSelect } = props

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

  return (
    <Stack spacing={1.5}>
      {events.map((evt) => (
        <Paper
          key={evt.id}
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0,0,0,0.04)',
            cursor: 'pointer',
            '&:active': { transform: 'scale(0.997)' },
          }}
          onClick={() => onSelect(evt)}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar
              sx={{
                bgcolor:
                  evt.type === 'cycling'
                    ? 'rgba(0, 150, 199, 0.1)'
                    : evt.type === 'swimming'
                      ? 'rgba(3, 169, 244, 0.12)'
                      : 'rgba(244, 67, 54, 0.1)',
                color:
                  evt.type === 'cycling'
                    ? '#006d77'
                    : evt.type === 'swimming'
                      ? '#0277bd'
                      : '#c62828',
              }}
            >
              {typeIcon(evt.type)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, fontSize: 15 }}
                  noWrap
                >
                  {evt.name}
                </Typography>
                <Chip
                  size="small"
                  label={typeLabel(evt.type)}
                  sx={{
                    height: 22,
                    borderRadius: 999,
                    fontSize: 11.5,
                    bgcolor: 'rgba(0,0,0,0.03)',
                  }}
                />
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, fontSize: 13.5 }}
              >
                {evt.date} · {evt.time}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, fontSize: 13 }}
              >
                {evt.location}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, fontSize: 13.5 }}>
                {evt.description}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
