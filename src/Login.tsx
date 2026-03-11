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
import { Google, Login as LoginIcon } from '@mui/icons-material'
import { useState } from 'react'

import { API_URL } from './config'

type LoginProps = {
  onAuthSuccess: (payload: { token: string; email: string; userId: string; role?: string }) => void
}

export function Login({ onAuthSuccess }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token') && window.location.pathname === '/reset-password'
      ? 'reset'
      : 'login'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const resetToken =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('token') ?? ''
      : ''

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
        role: data.user.role,
      })
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message || 'Something went wrong')
        return
      }
      setSuccessMsg(
        'If an account with that email exists, a password reset link has been sent. Check your inbox.',
      )
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!password || !confirmPassword) {
      setError('Please fill in both fields')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message || 'Something went wrong')
        return
      }
      setSuccessMsg('Password reset! You can now sign in with your new password.')
      window.history.replaceState({}, '', '/')
      setTimeout(() => {
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        setSuccessMsg(null)
      }, 3000)
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
            Shark Tracker
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
          {successMsg && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <Alert severity="success" sx={{ fontSize: 13 }}>
                {successMsg}
              </Alert>
            </Box>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <>
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
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
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

              {mode === 'login' && (
                <Box sx={{ width: '100%', textAlign: 'right', mt: 0.5 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setMode('forgot')
                      setError(null)
                      setSuccessMsg(null)
                    }}
                    sx={{ fontSize: 12, fontWeight: 500, textTransform: 'none' }}
                  >
                    Forgot your password?
                  </Button>
                </Box>
              )}

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
              </Stack>
            </>
          )}

          {mode === 'forgot' && (
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Enter your email and we&apos;ll generate a password reset link.
              </Typography>
              <TextField
                label="Email address"
                variant="outlined"
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleForgotPassword}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 999,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(0, 109, 119, 0.3)',
                }}
              >
                Send reset link
              </Button>
            </Stack>
          )}

          {mode === 'reset' && (
            <Stack spacing={2} sx={{ width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Enter your new password below.
              </Typography>
              <TextField
                label="New password"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <TextField
                label="Confirm password"
                type="password"
                variant="outlined"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleResetPassword}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 999,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(0, 109, 119, 0.3)',
                }}
              >
                Reset password
              </Button>
            </Stack>
          )}

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
                      setSuccessMsg(null)
                    }}
                    sx={{ fontWeight: 600, minWidth: 'auto', p: 0.5 }}
                  >
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  Back to{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setMode('login')
                      setError(null)
                      setSuccessMsg(null)
                      setPassword('')
                      setConfirmPassword('')
                      window.history.replaceState({}, '', '/')
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
