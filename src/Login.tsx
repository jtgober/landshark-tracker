import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  Alert,
} from '@mui/material'
import { Google, Facebook, Login as LoginIcon } from '@mui/icons-material'
import { useState } from 'react'

import { API_URL } from './config'

type LoginProps = {
  onAuthSuccess: (payload: { token: string; email: string; userId: string }) => void
}

export function Login({ onAuthSuccess }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${API_URL}/auth/${mode === 'login' ? 'login' : 'signup'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        setError(data?.message || 'Something went wrong')
        return
      }

      onAuthSuccess({
        token: data.token,
        email: data.user.email,
        userId: data.user.id,
      })
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    setError(null)
    // Redirect to backend OAuth start endpoint
    window.location.href = `${API_URL}/auth/${provider}`
  }

  return (
    <Box
      sx={{
        // Use dynamic viewport on mobile so the gradient always fills the screen,
        // even with the browser UI visible.
        minHeight: { xs: '100dvh', md: '100vh' },
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        background: 'radial-gradient(circle at top left, #00b4d8, #006d77 80%)',
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '25%',
              bgcolor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2.5,
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            <Box
              component="img"
              src="/landsharks-logo.png"
              alt="Louisville Landsharks"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, mb: 0.5, color: '#006d77' }}
          >
            shark tracker
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Club check-in & event safety
          </Typography>

          {error && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <Alert severity="error" sx={{ fontSize: 13 }}>
                {error}
              </Alert>
            </Box>
          )}

          <Stack spacing={2} sx={{ width: '100%' }}>
            <TextField
              label="Email address"
              variant="outlined"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={handleSubmit}
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: 999,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(0, 109, 119, 0.3)',
              }}
            >
              {mode === 'login' ? 'Sign In' : 'Create account'}
            </Button>
          </Stack>

          <Divider sx={{ width: '100%', my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Stack spacing={2} sx={{ width: '100%' }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Google />}
              onClick={() => handleSocialLogin('google')}
              sx={{
                py: 1.25,
                borderRadius: 999,
                color: '#db4437',
                borderColor: 'rgba(219, 68, 55, 0.5)',
                '&:hover': {
                  borderColor: '#db4437',
                  bgcolor: 'rgba(219, 68, 55, 0.04)',
                },
              }}
            >
              Continue with Google
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Facebook />}
              onClick={() => handleSocialLogin('facebook')}
              sx={{
                py: 1.25,
                borderRadius: 999,
                color: '#4267B2',
                borderColor: 'rgba(66, 103, 178, 0.5)',
                '&:hover': {
                  borderColor: '#4267B2',
                  bgcolor: 'rgba(66, 103, 178, 0.04)',
                },
              }}
            >
              Continue with Facebook
            </Button>
          </Stack>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setMode('signup')
                      setError(null)
                    }}
                    sx={{ fontWeight: 600, minWidth: 'auto', p: 0.5 }}
                  >
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setMode('login')
                      setError(null)
                    }}
                    sx={{ fontWeight: 600, minWidth: 'auto', p: 0.5 }}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
