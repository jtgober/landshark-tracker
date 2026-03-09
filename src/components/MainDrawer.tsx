import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'
import { DirectionsBike, DirectionsRun, Pool } from '@mui/icons-material'

export function MainDrawer(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box
        sx={{
          width: 260,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box sx={{ p: 2.5, pb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ letterSpacing: 1.4 }}>
            DISCIPLINES
          </Typography>
          <Typography
            variant="h6"
            sx={{ mt: 0.5, fontWeight: 700, fontSize: 20 }}
          >
            Club Activities
          </Typography>
        </Box>
        <Divider />
        <List sx={{ py: 0 }}>
          <ListItem>
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: 'rgba(0, 150, 199, 0.12)',
                  color: '#006d77',
                }}
              >
                <DirectionsBike />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary="Cycling"
              secondary="Group rides, long days, and intervals."
            />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: 'rgba(3, 169, 244, 0.12)',
                  color: '#0277bd',
                }}
              >
                <Pool />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary="Swimming"
              secondary="Pool sets and open water sessions."
            />
          </ListItem>
          <ListItem>
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: 'rgba(244, 67, 54, 0.12)',
                  color: '#c62828',
                }}
              >
                <DirectionsRun />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary="Running"
              secondary="Track workouts and long runs."
            />
          </ListItem>
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Use the Events tab to see what&apos;s coming up for each discipline.
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}
