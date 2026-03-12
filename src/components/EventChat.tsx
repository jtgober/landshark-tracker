import { useState, useEffect, useRef, useCallback } from 'react'
import { usePageVisibility } from '../hooks/usePageVisibility'
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material'
import { Send } from '@mui/icons-material'
import { API_URL, API_BASE } from '../config'

type Message = {
  id: string
  event_id: string
  user_id: string
  user_name: string
  avatar_color: string | null
  avatar_url: string | null
  avatar_updated_at: string | null
  body: string
  created_at: string
}

type Props = {
  eventId: string
  token: string
  currentUserId: string
}

export function EventChat({ eventId, token, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const isVisible = usePageVisibility()

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/messages/${eventId}`, { headers })
      if (res.ok) {
        const data: Message[] = await res.json()
        setMessages(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [eventId, token])

  useEffect(() => {
    fetchMessages()
    if (!isVisible) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = undefined
      }
      return
    }
    pollRef.current = setInterval(fetchMessages, 30_000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = undefined
      }
    }
  }, [fetchMessages, isVisible])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/messages/${eventId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: draft.trim() }),
      })
      if (res.ok) {
        const msg: Message = await res.json()
        setMessages((prev) => [...prev, msg])
        setDraft('')
      }
    } catch {
      // silent
    } finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const avatarSrc = (m: Message) => {
    if (!m.avatar_url) return undefined
    return m.avatar_url.startsWith('http')
      ? m.avatar_url
      : `${API_BASE}${m.avatar_url}${m.avatar_updated_at ? `?v=${m.avatar_updated_at}` : ''}`
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        sx={{
          maxHeight: 280,
          overflowY: 'auto',
          px: 0.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
        }}
      >
        {messages.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 3, fontSize: 13 }}
          >
            No messages yet — be the first to say something!
          </Typography>
        )}

        {messages.map((m) => {
          const isOwn = m.user_id === currentUserId
          return (
            <Stack
              key={m.id}
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{
                alignSelf: isOwn ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                flexDirection: isOwn ? 'row-reverse' : 'row',
              }}
            >
              <Avatar
                src={avatarSrc(m)}
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: 12,
                  bgcolor: avatarSrc(m) ? 'transparent' : (m.avatar_color || '#8ecae6'),
                  mt: 0.5,
                  ml: isOwn ? 1 : 0,
                  mr: isOwn ? 0 : 0,
                }}
              >
                {!avatarSrc(m) && m.user_name.charAt(0).toUpperCase()}
              </Avatar>
              <Box
                sx={{
                  bgcolor: isOwn ? 'primary.main' : 'action.hover',
                  color: isOwn ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 2.5,
                  px: 1.5,
                  py: 0.75,
                  minWidth: 0,
                }}
              >
                {!isOwn && (
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, fontSize: 11, display: 'block', mb: 0.15 }}
                  >
                    {m.user_name}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ fontSize: 13.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.body}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 10,
                    opacity: 0.65,
                    display: 'block',
                    textAlign: 'right',
                    mt: 0.25,
                  }}
                >
                  {formatTime(m.created_at)}
                </Typography>
              </Box>
            </Stack>
          )
        })}
        <div ref={bottomRef} />
      </Box>

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          placeholder="Type a message..."
          size="small"
          fullWidth
          multiline
          maxRows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              fontSize: 14,
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          color="primary"
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
            width: 38,
            height: 38,
          }}
        >
          <Send sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </Box>
  )
}
