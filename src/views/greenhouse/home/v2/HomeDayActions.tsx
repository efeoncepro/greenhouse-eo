'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import type { HomeClosingCountdownData, HomeReliabilityRibbonData, HomeTodayInboxData } from '@/lib/home/contract'

interface HomeDayActionsProps {
  closing: HomeClosingCountdownData | null
  inbox: HomeTodayInboxData | null
  reliability: HomeReliabilityRibbonData | null
}

interface DayAction {
  id: string
  label: string
  icon: string
  color: ThemeColor
  href: string
  primary?: boolean
}

const buildActions = (props: HomeDayActionsProps): DayAction[] => {
  const actions: DayAction[] = []

  // 1. Critical reliability incidents — always first
  const downModules = props.reliability?.modules.filter(m => m.status === 'down' || m.status === 'degraded') ?? []

  if (downModules.length > 0) {
    actions.push({
      id: 'reliability',
      label: `Revisar ${downModules.length} ${downModules.length === 1 ? 'incidente' : 'incidentes'}`,
      icon: 'tabler-alert-triangle',
      color: 'error',
      href: '/admin/operations',
      primary: true
    })
  }

  // 2. Closing windows that need attention (yellow or red)
  for (const item of props.closing?.items ?? []) {
    if (item.trafficLight === 'red' || item.trafficLight === 'yellow') {
      actions.push({
        id: item.closingId,
        label: `${item.label} ${item.periodLabel}`,
        icon: item.domain === 'finance' ? 'tabler-cash' : 'tabler-receipt',
        color: item.trafficLight === 'red' ? 'error' : 'warning',
        href: item.ctaHref ?? '/finance',
        primary: actions.length === 0
      })
    }
  }

  // 3. Approval pendings (high count of unread)
  if (props.inbox && props.inbox.totalUnread >= 3) {
    actions.push({
      id: 'inbox',
      label: `Aprobar ${props.inbox.totalUnread} pendientes`,
      icon: 'tabler-circle-check',
      color: 'primary',
      href: '/notifications',
      primary: actions.length === 0
    })
  }

  return actions.slice(0, 3)
}

/**
 * Smart Home v2 — Day Actions banner.
 *
 * Surfaces the 1-3 actions that block business outcomes RIGHT NOW
 * (incidents → closings → high-volume approvals). Lives between the
 * Pulse Strip and the Inbox so the user sees the next move before
 * scrolling. HubSpot Breeze "Today's tasks" + Linear "Priority queue"
 * pattern.
 *
 * Renders nothing when there's no urgent action — keeps the home
 * peaceful when the operation is healthy.
 */
export const HomeDayActions = (props: HomeDayActionsProps) => {
  const router = useRouter()
  const reduced = useReducedMotion()
  const actions = buildActions(props)

  if (actions.length === 0) return null

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.22, delay: 0.1, ease: [0.2, 0, 0, 1] }}
    >
      <Box
        component='section'
        aria-label='Acciones recomendadas para hoy'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          px: 3,
          py: 2,
          borderRadius: theme => theme.shape.customBorderRadius?.md ?? 6,
          border: theme => `1px solid ${theme.palette.divider}`,
          bgcolor: theme => `color-mix(in oklch, ${theme.palette.primary.main} 4%, ${theme.palette.background.paper})`
        }}
      >
        <CustomAvatar skin='light' variant='rounded' color='primary' size={32}>
          <i className='tabler-bolt text-[18px]' />
        </CustomAvatar>
        <Stack flex={1} minWidth={0} sx={{ minWidth: 200 }}>
          <Typography variant='body1' sx={{ fontWeight: 500 }}>
            Próximos pasos
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {actions.length} {actions.length === 1 ? 'acción sugerida' : 'acciones sugeridas'} para tu operación
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          {actions.map(action => (
            <Button
              key={action.id}
              size='small'
              variant={action.primary ? 'contained' : 'tonal'}
              color={action.color}
              startIcon={<i className={classnames(action.icon, 'text-[16px]')} />}
              onClick={() => router.push(action.href)}
              sx={{ textTransform: 'none' }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Box>
    </motion.div>
  )
}

export default HomeDayActions
