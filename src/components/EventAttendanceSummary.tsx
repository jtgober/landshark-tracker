import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import type { ClubEvent, Member } from '../types'

export function EventAttendanceSummary(props: {
  event: ClubEvent
  members: Member[]
  attendance: Record<string, 'in' | 'out'>
}) {
  const { event, members, attendance } = props

  const joinedMembers = members.filter((m) => attendance[m.id] !== undefined)
  const outOnCourse = joinedMembers.filter((m) => attendance[m.id] === 'in')
  const backSafe = joinedMembers.filter((m) => attendance[m.id] !== 'in')

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: 1.5,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ textTransform: 'uppercase', letterSpacing: 1.4 }}
            >
              {event.type}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
              {outOnCourse.length} out on course
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 13.5 }}
            >
              {backSafe.length} back at base
            </Typography>
          </Box>
          <Stack alignItems="flex-end" spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13.5 }}>
              {event.date}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
              {event.time}
            </Typography>
          </Stack>
        </Stack>
        {outOnCourse.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            {outOnCourse.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                size="small"
                sx={{
                  borderRadius: 999,
                  fontSize: 11.5,
                  bgcolor: 'action.selected',
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
