import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  CheckCircle,
  DeleteOutline,
  Edit as EditIcon,
  Login,
  Logout,
  Map as MapIcon,
  OpenInNew,
  PersonAdd,
  PersonRemove,
  Phone,
  Sms,
} from '@mui/icons-material'
import type { ClubEvent, Member } from '../types'
import { API_BASE } from '../config'
import { EventAttendanceSummary } from './EventAttendanceSummary'
import { EventLocationMap } from './EventLocationMap'
import { EventLocationPreview } from './EventLocationPreview'
import { EventChat } from './EventChat'

function CourseMapSection({ url }: { url: string }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
        Course map
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontSize: 13 }}
        >
          <OpenInNew sx={{ fontSize: 14 }} />
          View course map
        </Link>
      </Stack>
    </Box>
  )
}

function ToggleActionButton({
  isIn,
  onToggle,
}: {
  isIn: boolean
  onToggle: () => void
}) {
  const [animating, setAnimating] = useState(false)

  const handleClick = () => {
    setAnimating(true)
    onToggle()
    setTimeout(() => setAnimating(false), 420)
  }

  return (
    <Tooltip title={isIn ? 'Sign out' : 'Check in'} placement="left">
      <IconButton
        aria-label={isIn ? 'Sign out' : 'Check in'}
        onClick={handleClick}
        size="medium"
        color={isIn ? 'inherit' : 'primary'}
        sx={{
          bgcolor: isIn ? 'action.hover' : 'primary.main',
          color: isIn ? 'text.primary' : 'primary.contrastText',
          '&:hover': {
            bgcolor: isIn ? 'action.selected' : 'primary.dark',
          },
          '@keyframes tapPop': {
            '0%': { transform: 'scale(1)' },
            '35%': { transform: 'scale(1.4)' },
            '55%': { transform: 'scale(1.4)' },
            '100%': { transform: 'scale(1)' },
          },
          animation: animating ? 'tapPop 0.42s ease' : 'none',
        }}
      >
        {isIn ? <Logout fontSize="small" /> : <Login fontSize="small" />}
      </IconButton>
    </Tooltip>
  )
}

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
  onEditEvent?: () => void
  authToken?: string
  currentUserId?: string
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
    onEditEvent,
    authToken,
    currentUserId,
  } = props

  const [showMap, setShowMap] = useState(false)

  const hasOnCourseMembers =
    event &&
    members.some(
      (m) => attendance[event.id]?.[m.id] === 'in',
    )
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
            {(event.location || (event as { location_url?: string }).location_url) && (
              <EventLocationPreview
                location={event.location}
                locationUrl={(event as { location_url?: string }).location_url ?? (event as { locationUrl?: string }).locationUrl}
              />
            )}
            {(event as { course_map_url?: string | null }).course_map_url && (
              <CourseMapSection url={(event as { course_map_url?: string }).course_map_url!} />
            )}
            {currentUserStatus && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  border: '1px dashed',
                  borderColor: 'divider',
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
                    <Tooltip title="Join event" placement="left">
                      <IconButton
                        onClick={onJoinEvent}
                        size="medium"
                        color="primary"
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { bgcolor: 'primary.dark' },
                          borderRadius: 999,
                        }}
                      >
                        <PersonAdd />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Leave event" placement="left">
                      <IconButton
                        onClick={onLeaveEvent}
                        size="medium"
                        color="error"
                        sx={{
                          bgcolor: 'error.main',
                          color: 'error.contrastText',
                          '&:hover': { bgcolor: 'error.dark' },
                          borderRadius: 999,
                        }}
                      >
                        <PersonRemove />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 13.5 }}
            >
              Tap the icon to check in when you start, and to check out when you return safely.
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
                      <ToggleActionButton
                        isIn={isIn}
                        onToggle={() => onToggleAttendance(member.id)}
                      />
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={avatarSrc}
                        sx={{
                          bgcolor: avatarSrc ? 'transparent' : member.avatarColor,
                          color: avatarSrc ? undefined : 'text.primary',
                          fontWeight: 700,
                        }}
                      >
                        {!avatarSrc && initials}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{ pr: 2 }}
                      secondaryTypographyProps={{ component: 'div' }}
                      primary={
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, fontSize: 15 }}
                          noWrap
                        >
                          {member.name}
                        </Typography>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                          <Box>
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
                                  ? 'rgba(77, 182, 172, 0.15)'
                                  : 'action.disabledBackground',
                              }}
                            />
                          </Box>
                          {member.phone && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Tooltip title={`Call ${member.phone}`}>
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={`tel:${member.phone}`}
                                  sx={{ color: 'success.main', p: 0.25 }}
                                >
                                  <Phone sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={`Text ${member.phone}`}>
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={`sms:${member.phone}`}
                                  sx={{ color: 'info.main', p: 0.25 }}
                                >
                                  <Sms sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>

            <Button
              variant={showMap ? 'contained' : 'outlined'}
              size="small"
              startIcon={<MapIcon />}
              onClick={() => setShowMap((v) => !v)}
              disabled={!hasOnCourseMembers && !showMap}
              sx={{ borderRadius: 999, fontSize: 13, alignSelf: 'flex-start' }}
            >
              {showMap ? 'Hide map' : 'Show map'}
            </Button>
            {!hasOnCourseMembers && !showMap && (
              <Typography variant="caption" color="text.secondary">
                The map will be available when members are on course and sharing
                their location.
              </Typography>
            )}

            {event && (
              <EventLocationMap
                eventId={event.id}
                visible={showMap}
                currentUserId={currentUserId}
              />
            )}

            {/* Chat */}
            {event && authToken && currentUserId && (
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, fontSize: 13.5, mb: 1, color: 'text.secondary' }}
                >
                  Event Chat
                </Typography>
                <EventChat
                  eventId={event.id}
                  token={authToken}
                  currentUserId={currentUserId}
                />
              </Box>
            )}
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
          {onEditEvent && (
            <IconButton
              size="small"
              color="primary"
              onClick={onEditEvent}
              sx={{ mr: 1 }}
              aria-label="Edit event"
            >
              <EditIcon />
            </IconButton>
          )}
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
