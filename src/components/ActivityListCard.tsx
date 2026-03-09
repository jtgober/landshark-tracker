import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import { Login, Logout } from '@mui/icons-material'
import type { Activity } from '../types'

export function ActivityListCard(props: { activity: Activity[] }) {
  const { activity } = props

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        borderRadius: 3,
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <List dense disablePadding>
        {activity.map((entry) => (
          <ListItem key={entry.id}>
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor:
                    entry.type === 'in'
                      ? 'rgba(0, 109, 119, 0.1)'
                      : 'rgba(255, 111, 97, 0.12)',
                  color: entry.type === 'in' ? '#005259' : '#c32f27',
                }}
              >
                {entry.type === 'in' ? <Login /> : <Logout />}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, mb: 0.25, fontSize: 13.5 }}
                >
                  {entry.description}
                </Typography>
              }
              secondary={
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 12 }}
                >
                  {entry.time}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
