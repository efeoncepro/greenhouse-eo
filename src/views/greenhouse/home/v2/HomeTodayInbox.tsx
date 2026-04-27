'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeTodayInboxData, TodayInboxItem, TodayInboxKind, TodayInboxSeverity } from '@/lib/home/contract'

interface HomeTodayInboxProps {
  data: HomeTodayInboxData
}

const KIND_META: Record<TodayInboxKind, { label: string; icon: string; color: ThemeColor }> = {
  approval: { label: 'Aprobación', icon: 'tabler-circle-check', color: 'primary' },
  closing: { label: 'Cierre', icon: 'tabler-calendar-check', color: 'info' },
  sla_breach: { label: 'SLA', icon: 'tabler-alert-triangle', color: 'error' },
  sync_drift: { label: 'Sync', icon: 'tabler-refresh', color: 'warning' },
  mention: { label: 'Mención', icon: 'tabler-at', color: 'info' },
  task: { label: 'Tarea', icon: 'tabler-checklist', color: 'primary' },
  incident: { label: 'Incidente', icon: 'tabler-bug', color: 'error' },
  reminder: { label: 'Recordatorio', icon: 'tabler-bell', color: 'secondary' }
}

const SEVERITY_TONE: Record<TodayInboxSeverity, { color: ThemeColor; label: string }> = {
  critical: { color: 'error', label: 'Crítico' },
  warning: { color: 'warning', label: 'Atención' },
  info: { color: 'info', label: 'Info' }
}

const formatRelativeDue = (dueAt: string | null): string | null => {
  if (!dueAt) return null
  const target = new Date(dueAt).getTime()

  if (Number.isNaN(target)) return null
  const diffMs = target - Date.now()
  const absHours = Math.abs(Math.round(diffMs / 36e5))

  if (diffMs < 0) {
    if (absHours < 1) return 'vencido recién'

    return `vencido hace ${absHours} h`
  }

  if (absHours < 1) return 'en menos de 1 h'
  if (absHours < 24) return `en ${absHours} h`

  return `en ${Math.round(absHours / 24)} d`
}

interface TodayItemRowProps {
  item: TodayInboxItem
  onAction: (item: TodayInboxItem, actionId: TodayInboxItem['actions'][number]['actionId']) => void
}

const TodayItemRow = ({ item, onAction }: TodayItemRowProps) => {
  const reduced = useReducedMotion()
  const meta = KIND_META[item.kind] ?? KIND_META.reminder
  const severity = SEVERITY_TONE[item.severity]
  const dueLabel = formatRelativeDue(item.dueAt)

  return (
    <motion.div
      layout
      exit={reduced ? undefined : { opacity: 0, x: 24, height: 0 }}
      transition={reduced ? undefined : { duration: 0.18, ease: [0.2, 0, 0, 1] }}
    >
      <Stack
        direction='row'
        alignItems='flex-start'
        spacing={2}
        sx={{
          py: 1.5,
          px: 2,
          borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
          transition: 'background-color 120ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <CustomAvatar skin='light' color={meta.color} size={36}>
          <i className={meta.icon} style={{ fontSize: 18 }} />
        </CustomAvatar>
        <Stack flex={1} minWidth={0} spacing={0.5}>
          <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap' useFlexGap>
            <Typography variant='body2' sx={{ fontWeight: 500 }}>{item.title}</Typography>
            <Chip
              size='small'
              variant='outlined'
              color={severity.color}
              label={severity.label}
              sx={{ height: 20, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}
            />
            {dueLabel ? (
              <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
                {dueLabel}
              </Typography>
            ) : null}
          </Stack>
          {item.description ? (
            <Typography variant='caption' color='text.secondary' sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.description}
            </Typography>
          ) : null}
          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap' sx={{ mt: 0.5 }}>
            {item.actions.map(action => (
              <Tooltip key={action.actionId} title={`${action.label}`}>
                <Button
                  size='small'
                  variant={action.primary ? 'tonal' : 'outlined'}
                  color={action.actionId === 'approve' ? 'success' : action.actionId === 'dismiss' ? 'secondary' : 'primary'}
                  onClick={() => onAction(item, action.actionId)}
                  sx={{ minWidth: 0, px: 1.5, py: 0.25 }}
                >
                  {action.label}
                </Button>
              </Tooltip>
            ))}
          </Stack>
        </Stack>
        <IconButton size='small' aria-label={`Descartar ${item.title}`} onClick={() => onAction(item, 'dismiss')}>
          <i className='tabler-x' style={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    </motion.div>
  )
}

export const HomeTodayInbox = ({ data }: HomeTodayInboxProps) => {
  const router = useRouter()
  const [items, setItems] = useState(data.items)

  const dispatchAction = async (item: TodayInboxItem, actionId: TodayInboxItem['actions'][number]['actionId']) => {
    if (actionId === 'open' && item.href) {
      router.push(item.href)

      return
    }

    setItems(prev => prev.filter(prevItem => prevItem.itemId !== item.itemId))

    try {
      await fetch(`/api/home/inbox/${actionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.itemId, kind: item.kind })
      })
    } catch {
      // optimistic — surfacing the error is handled by toast at app level when wired in Slice 3
    }
  }

  return (
    <Card
      component='section'
      aria-label='Tu día'
      role='region'
      sx={{
        '& .MuiCardHeader-action': { alignSelf: 'center' }
      }}
    >
      <CardHeader
        title={
          <Stack direction='row' alignItems='center' spacing={1.5}>
            <CustomAvatar variant='rounded' skin='light' color='primary' size={32}>
              <i className='tabler-inbox' style={{ fontSize: 18 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6' component='h2'>Tu día</Typography>
              <Typography variant='caption' color='text.secondary'>
                {items.length} {items.length === 1 ? 'pendiente' : 'pendientes'}
                {data.totalUnread > items.length ? ` · ${data.totalUnread} no leídas en total` : ''}
              </Typography>
            </Box>
          </Stack>
        }
        action={
          <Button size='small' variant='text' onClick={() => router.push('/notifications')}>
            Ver todo
          </Button>
        }
      />
      <CardContent sx={{ pt: 0, pb: 1, px: 1 }}>
        {items.length === 0 ? (
          <Stack
            role='status'
            aria-live='polite'
            spacing={1.5}
            alignItems='center'
            sx={{ py: 6, color: 'text.secondary' }}
          >
            <CustomAvatar variant='rounded' skin='light' color='success' size={48}>
              <i className='tabler-check' style={{ fontSize: 24 }} />
            </CustomAvatar>
            <Typography variant='body2'>No tienes pendientes hoy. ¡Buen trabajo!</Typography>
          </Stack>
        ) : (
          <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider', mx: 2 }} />}>
            <AnimatePresence initial={false}>
              {items.map(item => (
                <TodayItemRow key={item.itemId} item={item} onAction={dispatchAction} />
              ))}
            </AnimatePresence>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default HomeTodayInbox
