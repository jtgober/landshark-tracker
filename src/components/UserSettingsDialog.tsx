import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import { useState, useRef } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import { API_URL } from '../config'

type Props = {
  open: boolean
  onClose: () => void
  auth: { token: string; email: string; userId: string }
  onAuthUpdate: (next: { email?: string; avatarUrl?: string }) => void
  avatarUrl?: string
}

export function UserSettingsDialog({
  open,
  onClose,
  auth,
  onAuthUpdate,
  avatarUrl,
}: Props) {
  const [email, setEmail] = useState(auth.email)
  const [password, setPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const resetMessages = () => {
    setMessage(null)
    setError(null)
  }

  const handleSaveProfile = async (event?: FormEvent) => {
    event?.preventDefault()
    resetMessages()

    if (!email && !password) {
      setError('Enter a new email and/or password to update.')
      return
    }

    setSavingProfile(true)
    try {
      const body: { email?: string; password?: string } = {}
      if (email && email !== auth.email) body.email = email
      if (password) body.password = password

      if (!body.email && !body.password) {
        setError('No changes to save.')
        return
      }

      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.message || 'Failed to update profile.')
        return
      }

      onAuthUpdate({ email: data.email })
      setPassword('')
      setMessage('Profile updated.')
    } catch (err) {
      setError('Network error while updating profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    resetMessages()
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append('avatar', file)

      const res = await fetch(`${API_URL}/auth/me/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: form,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.message || 'Failed to upload avatar.')
        return
      }

      if (data.avatarUrl) {
        onAuthUpdate({ avatarUrl: data.avatarUrl })
        setMessage('Avatar updated.')
      }
    } catch (err) {
      setError('Network error while uploading avatar.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Account settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {(message || error) && (
            <Box>
              {error && (
                <Alert severity="error" sx={{ fontSize: 13, mb: message ? 1 : 0 }}>
                  {error}
                </Alert>
              )}
              {message && !error && (
                <Alert severity="success" sx={{ fontSize: 13 }}>
                  {message}
                </Alert>
              )}
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ fontSize: 13, opacity: 0.8, mb: 1 }}>
              Avatar
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={avatarUrl}
                sx={{ width: 40, height: 40, bgcolor: '#ffb703' }}
              >
                {auth.email.charAt(0).toUpperCase()}
              </Avatar>
              <Button
                variant="outlined"
                size="small"
                component="label"
                disabled={uploadingAvatar}
                sx={{ borderRadius: 999 }}
              >
                Upload from computer
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                />
              </Button>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5 }}
            >
              Use a small square image for best results.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSaveProfile}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontSize: 13, opacity: 0.8 }}>
                Email & password
              </Typography>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="New password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Leave blank to keep your current password."
              />
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={savingProfile}
                sx={{ alignSelf: 'flex-start', mt: 0.5, borderRadius: 999 }}
              >
                Save changes
              </Button>
            </Stack>
          </Box>

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

