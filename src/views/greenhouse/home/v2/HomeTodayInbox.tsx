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
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionMenu from '@core/components/option-menu'
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

const SEVERITY_TONE: Record<TodayInboxSeverity, ThemeColor> = {
  critical: 'error',
  warning: 'warning',
  info: 'info'
}

const SEVERITY_LABEL: Record<TodayInboxSeverity, string> = {
  critical: 'Crítico',
  warning: 'Atención',
  info: 'Info'
}

const formatRelativeDue = (dueAt: string | null): string | null => {
  if (!dueAt) return null
  const target = new Date(dueAt).getTime()

  if (Number.isNaN(target)) return null
  const diffMs = target - Date.now()
  const absHours = Math.abs(Math.round(diffMs / 36e5))

  if (diffMs < 0) {
    if (absHours < 1) return 'vencido recién'

    return `vencido ${absHours} h`
  }

  if (absHours < 1) return '< 1 h'
  if (absHours < 24) return `${absHours} h`

  return `${Math.round(absHours / 24)} d`
}

interface TodayItemRowProps {
  item: TodayInboxItem
  onAction: (item: TodayInboxItem, actionId: TodayInboxItem['actions'][number]['actionId']) => void
}

const TodayItemRow = ({ item, onAction }: TodayItemRowProps) => {
  const reduced = useReducedMotion()
  const meta = KIND_META[item.kind] ?? KIND_META.reminder
  const dueLabel = formatRelativeDue(item.dueAt)

  return (
    <motion.div
      layout
      exit={reduced ? undefined : { opacity: 0, x: 24, height: 0 }}
      transition={reduced ? undefined : { duration: 0.18, ease: [0.2, 0, 0, 1] }}
    >
      <div className='flex items-center gap-4'>
        <CustomAvatar skin='light' variant='rounded' color={meta.color} size={34}>
          <i className={classnames(meta.icon, 'text-[20px]')} />
        </CustomAvatar>
        <div className='flex flex-wrap justify-between items-center gap-x-4 gap-y-1 is-full'>
          <div className='flex flex-col min-is-0' style={{ flex: 1 }}>
            <Typography className='font-medium' color='text.primary' noWrap>
              {item.title}
            </Typography>
            <Typography variant='body2' noWrap>
              {meta.label}
              {item.description ? ` · ${item.description}` : ''}
            </Typography>
          </div>
          <Stack direction='row' spacing={1} alignItems='center'>
            {item.severity !== 'info' ? (
              <Chip
                size='small'
                variant='tonal'
                color={SEVERITY_TONE[item.severity]}
                label={SEVERITY_LABEL[item.severity]}
                sx={{ height: 22, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}
              />
            ) : null}
            {dueLabel ? (
              <Typography variant='body2' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {dueLabel}
              </Typography>
            ) : null}
            {item.actions.find(a => a.primary) ? (
              <Tooltip title={item.actions.find(a => a.primary)?.label ?? 'Abrir'}>
                <Button
                  size='small'
                  variant='tonal'
                  color={item.kind === 'approval' ? 'success' : 'primary'}
                  onClick={() => {
                    const primary = item.actions.find(a => a.primary)

                    if (primary) onAction(item, primary.actionId)
                  }}
                  sx={{ minWidth: 0, px: 1.75, py: 0.25 }}
                >
                  {item.actions.find(a => a.primary)?.label}
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip title='Descartar'>
              <IconButton size='small' aria-label={`Descartar ${item.title}`} onClick={() => onAction(item, 'dismiss')}>
                <i className='tabler-x text-[16px]' />
              </IconButton>
            </Tooltip>
          </Stack>
        </div>
      </div>
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
      // optimistic — toast handled at app level
    }
  }

  return (
    <Card component='section' aria-label='Tu día'>
      <CardHeader
        avatar={<i className='tabler-inbox text-xl' />}
        title='Tu día'
        subheader={
          items.length === 0
            ? 'Bandeja al día'
            : `${items.length} ${items.length === 1 ? 'pendiente' : 'pendientes'}${data.totalUnread > items.length ? ` · ${data.totalUnread} no leídas` : ''}`
        }
        titleTypographyProps={{ variant: 'h5' }}
        action={<OptionMenu options={['Marcar todo como leído', 'Ver todo', 'Configurar notificaciones']} />}
        sx={{ '& .MuiCardHeader-avatar': { mr: 3 } }}
      />
      <CardContent className='flex flex-col gap-[1.125rem]'>
        {items.length === 0 ? (
          <Box
            role='status'
            aria-live='polite'
            sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, color: 'text.secondary' }}
          >
            <CustomAvatar skin='light' variant='rounded' color='success' size={34}>
              <i className='tabler-check text-[20px]' />
            </CustomAvatar>
            <Typography variant='body2'>Sin pendientes hoy. Todo bajo control.</Typography>
          </Box>
        ) : (
          <AnimatePresence initial={false}>
            {items.map(item => (
              <TodayItemRow key={item.itemId} item={item} onAction={dispatchAction} />
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}

export default HomeTodayInbox
