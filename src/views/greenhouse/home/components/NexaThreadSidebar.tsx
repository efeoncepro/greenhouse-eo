'use client'

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { NexaThreadListItem } from '@/lib/nexa/nexa-contract'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

const TASK407_ARIA_HISTORIAL_DE_CONVERSACIONES = "Historial de conversaciones"
const TASK407_ARIA_CERRAR_HISTORIAL = "Cerrar historial"


interface Props {
  open: boolean
  onClose: () => void
  activeThreadId: string | null
  onSelectThread: (threadId: string) => void
  onNewThread: () => void
}

const formatRelative = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} dias`

  return formatGreenhouseDate(date, {
  day: 'numeric',
  month: 'short'
}, 'es-CL')
}

const groupByDate = (threads: NexaThreadListItem[]) => {
  const groups: Array<{ label: string; items: NexaThreadListItem[] }> = []
  let currentLabel = ''

  for (const thread of threads) {
    const label = formatRelative(thread.lastMessageAt)

    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, items: [thread] })
    } else {
      groups[groups.length - 1].items.push(thread)
    }
  }

  return groups
}

const NexaThreadSidebar = ({ open, onClose, activeThreadId, onSelectThread, onNewThread }: Props) => {
  const [threads, setThreads] = useState<NexaThreadListItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchThreads = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/home/nexa/threads')

      if (res.ok) {
        const data = await res.json()

        setThreads(data.threads ?? data ?? [])
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchThreads()
  }, [open, fetchThreads])

  const groups = groupByDate(threads)

  return (
    <Drawer
      anchor='left'
      open={open}
      onClose={onClose}
      aria-label={TASK407_ARIA_HISTORIAL_DE_CONVERSACIONES}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 320 } } }}
    >
      <Stack sx={{ height: '100%' }}>
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 2.5 }}>
          <Typography variant='h6'>Conversaciones</Typography>
          <IconButton size='small' onClick={onClose} aria-label={TASK407_ARIA_CERRAR_HISTORIAL}>
            <i className='tabler-x' style={{ fontSize: '1.125rem' }} />
          </IconButton>
        </Stack>

        <Box sx={{ px: 2.5, pb: 2 }}>
          <Button
            variant='contained'
            fullWidth
            startIcon={<i className='tabler-plus' />}
            onClick={() => {
              onNewThread()
              onClose()
            }}
          >
            Nueva conversacion
          </Button>
        </Box>

        <Divider />

        {/* Thread list */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
          {loading ? (
            <Stack spacing={1.5}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant='rounded' height={44} sx={{ borderRadius: 2 }} />
              ))}
            </Stack>
          ) : threads.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <i className='tabler-messages-off' style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
              <Typography variant='body2'>Sin conversaciones previas.</Typography>
            </Box>
          ) : (
            <Stack spacing={0.5}>
              {groups.map(group => (
                <Box key={group.label}>
                  <Typography variant='overline' color='text.secondary' sx={{ px: 1, py: 1, display: 'block' }}>
                    {group.label}
                  </Typography>
                  {group.items.map(thread => {
                    const isActive = thread.threadId === activeThreadId

                    return (
                      <Box
                        key={thread.threadId}
                        onClick={() => {
                          onSelectThread(thread.threadId)
                          onClose()
                        }}
                        sx={{
                          px: 1.5,
                          py: 1.25,
                          borderRadius: 2,
                          cursor: 'pointer',
                          borderLeft: isActive ? '3px solid' : '3px solid transparent',
                          borderLeftColor: isActive ? 'primary.main' : 'transparent',
                          bgcolor: isActive ? 'primary.lighterOpacity' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: isActive ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {thread.title}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {thread.messageCount} mensajes
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Drawer>
  )
}

export default NexaThreadSidebar
