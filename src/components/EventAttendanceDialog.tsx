import {
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  Box,
} from '@mui/material'
import { CheckCircle, Login, Logout, DeleteOutline } from '@mui/icons-material'
import type { ClubEvent, Member } from '../types'
import { API_BASE } from '../config'
import { EventAttendanceSummary } from './EventAttendanceSummary'

export function EventAttendanceDialog(props: {
  event: ClubEvent | null
  members: Member[]
  attendance: Record<string, Record<string, 'in' | 'out'>>
  isSmall: boolean
  onClose: () => void
  onToggleAttendance: (memberId: string) => void
  currentUserStatus?: 'none' | 'out' | 'in'
  onJoinEvent?: () => void
  onLeaveEvent?: () => void
  currentUserMemberId?: string
  currentUserAvatarUrl?: string
  onDeleteEvent?: () => void
}) {
  const {
    event,
    members,
    attendance,
    isSmall,
    onClose,
    onToggleAttendance,
    currentUserStatus,
    onJoinEvent,
    onLeaveEvent,
    currentUserMemberId,
    currentUserAvatarUrl,
    onDeleteEvent,
  } = props

  return (
    <Dialog
      open={Boolean(event)}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isSmall}
    >
      <DialogTitle>{event ? event.name : 'Event attendance'}</DialogTitle>
      <DialogContent dividers>
        {event && (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <EventAttendanceSummary
              event={event}
              members={members}
              attendance={attendance[event.id] ?? {}}
            />
            {currentUserStatus && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'rgba(0,0,0,0.02)',
                  border: '1px dashed rgba(0,0,0,0.08)',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, fontSize: 13.5 }}
                    >
                      Your status
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: 13 }}
                    >
                      {currentUserStatus === 'none'
                        ? 'Join this event to start tracking your own check‑ins.'
                        : 'You are part of this event. Leave if you no longer want to track yourself here.'}
                    </Typography>
                  </Box>
                  {currentUserStatus === 'none' ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={onJoinEvent}
                      sx={{ borderRadius: 999, fontSize: 13 }}
                    >
                      Join event
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={onLeaveEvent}
                      sx={{ borderRadius: 999, fontSize: 13 }}
                    >
                      Leave
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 13.5 }}
            >
              Tap a member to mark them as checked in when they start, and
              checked out when they return safely.
            </Typography>
            <List disablePadding>
              {event &&
                members
                  .filter((member) => attendance[event.id]?.[member.id] !== undefined)
                  .map((member) => {
                const initials = member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()

                const eventStatus = attendance[event.id]?.[member.id] ?? 'out'
                const isIn = eventStatus === 'in'

                const isCurrentUser =
                  currentUserMemberId && member.id === currentUserMemberId
                const avatarSrc =
                  member.avatarUrl != null && member.avatarUrl !== ''
                    ? member.avatarUrl.startsWith('http')
                      ? member.avatarUrl
                      : `${API_BASE}${member.avatarUrl}${member.avatarUpdatedAt ? `?v=${member.avatarUpdatedAt}` : ''}`
                    : isCurrentUser
                      ? currentUserAvatarUrl
                      : undefined

                return (
                  <ListItem
                    key={member.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant={isIn ? 'outlined' : 'contained'}
                        color={isIn ? 'inherit' : 'primary'}
                        startIcon={isIn ? <Logout /> : <Login />}
                        onClick={() => onToggleAttendance(member.id)}
                        sx={{
                          borderRadius: 999,
                          px: 1.6,
                          minWidth: 'auto',
                          fontSize: 13,
                        }}
                      >
                        {isIn ? 'Signed out' : 'Checked in'}
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={avatarSrc}
                        sx={{
                          bgcolor: avatarSrc ? 'transparent' : member.avatarColor,
                          color: avatarSrc ? undefined : '#002b36',
                          fontWeight: 700,
                        }}
                      >
                        {!avatarSrc && initials}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ mb: 0.25 }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, fontSize: 15 }}
                          >
                            {member.name}
                          </Typography>
                          <Chip
                            label={isIn ? 'On course' : 'Back'}
                            size="small"
                            icon={<CheckCircle sx={{ fontSize: 14 }} />}
                            sx={{
                              height: 24,
                              borderRadius: 999,
                              pl: 0.5,
                              pr: 1,
                              backgroundColor: isIn
                                ? 'rgba(0, 109, 119, 0.08)'
                                : 'rgba(158, 158, 158, 0.12)',
                            }}
                          />
                        </Stack>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: 13 }}
                        >
                          {isIn
                            ? 'Marked out on this course'
                            : 'Waiting to start or already back'}
                        </Typography>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          {onDeleteEvent && (
            <IconButton
              size="small"
              color="error"
              onClick={onDeleteEvent}
              sx={{ mr: 1 }}
            >
              <DeleteOutline />
            </IconButton>
          )}
        </Box>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
