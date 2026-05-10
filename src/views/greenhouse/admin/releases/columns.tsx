'use client'

import { createColumnHelper } from '@tanstack/react-table'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { GH_RELEASE_ADMIN } from '@/lib/copy/release-admin'
import { formatDateTime } from '@/lib/format'
import CustomChip from '@core/components/mui/Chip'
import type { ReleaseManifest } from '@/lib/release/manifest-store'
import type { ReleaseState } from '@/lib/release/state-machine'

/**
 * TASK-854 Slice 1 — Tabla columns canónicos para /admin/releases.
 *
 * Estado chip color + icon canonical per CLAUDE.md greenhouse-ux skill:
 *   released → success (#6ec207, tabler-circle-check)
 *   degraded → warning (#ff6500, tabler-alert-triangle)
 *   aborted | rolled_back → error (#bb1954, tabler-x)
 *   in-flight (preflight/ready/deploying/verifying) → info (#00BAD1, tabler-loader)
 */

const STATE_DISPLAY: Record<
  ReleaseState,
  {
    label: string
    color: 'success' | 'warning' | 'error' | 'info'
    icon: string
  }
> = {
  preflight: { label: GH_RELEASE_ADMIN.state_label_preflight, color: 'info', icon: 'tabler-loader-2' },
  ready: { label: GH_RELEASE_ADMIN.state_label_ready, color: 'info', icon: 'tabler-loader-2' },
  deploying: { label: GH_RELEASE_ADMIN.state_label_deploying, color: 'info', icon: 'tabler-loader-2' },
  verifying: { label: GH_RELEASE_ADMIN.state_label_verifying, color: 'info', icon: 'tabler-loader-2' },
  released: { label: GH_RELEASE_ADMIN.state_label_released, color: 'success', icon: 'tabler-circle-check' },
  degraded: { label: GH_RELEASE_ADMIN.state_label_degraded, color: 'warning', icon: 'tabler-alert-triangle' },
  aborted: { label: GH_RELEASE_ADMIN.state_label_aborted, color: 'error', icon: 'tabler-x' },
  rolled_back: { label: GH_RELEASE_ADMIN.state_label_rolled_back, color: 'error', icon: 'tabler-arrow-back' }
}

const formatDuration = (startedAt: string, completedAt: string | null): string => {
  if (!completedAt) return GH_RELEASE_ADMIN.duration_pending

  const ms = Date.parse(completedAt) - Date.parse(startedAt)

  if (!Number.isFinite(ms) || ms < 0) return GH_RELEASE_ADMIN.duration_pending

  const minutes = Math.round(ms / 60_000)

  if (minutes < 1) return `<1 min`
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

const columnHelper = createColumnHelper<ReleaseManifest>()

export const releaseColumns = [
  columnHelper.accessor('targetSha', {
    header: GH_RELEASE_ADMIN.column_sha,
    cell: info => (
      <Typography
        variant='body2'
        sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}
      >
        {info.getValue().slice(0, 12)}
      </Typography>
    ),
    enableSorting: false
  }),
  columnHelper.accessor('state', {
    header: GH_RELEASE_ADMIN.column_state,
    cell: info => {
      const state = info.getValue()
      const display = STATE_DISPLAY[state]

      return (
        <CustomChip
          round='true'
          size='small'
          label={display.label}
          color={display.color}
          variant='tonal'
          icon={<i className={display.icon} aria-hidden='true' />}
        />
      )
    },
    enableSorting: true
  }),
  columnHelper.accessor('startedAt', {
    header: GH_RELEASE_ADMIN.column_started_at,
    cell: info => (
      <Typography variant='body2' color='text.secondary'>
        {formatDateTime(info.getValue())}
      </Typography>
    ),
    enableSorting: true
  }),
  columnHelper.accessor(row => formatDuration(row.startedAt, row.completedAt), {
    id: 'duration',
    header: GH_RELEASE_ADMIN.column_duration,
    cell: info => (
      <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {info.getValue()}
      </Typography>
    ),
    enableSorting: false
  }),
  columnHelper.accessor('triggeredBy', {
    header: GH_RELEASE_ADMIN.column_operator,
    cell: info => (
      <Typography variant='body2'>{info.getValue() || GH_RELEASE_ADMIN.operator_pending}</Typography>
    ),
    enableSorting: false
  }),
  columnHelper.accessor('attemptN', {
    header: GH_RELEASE_ADMIN.column_attempt,
    cell: info => (
      <Box
        component='span'
        sx={{
          display: 'inline-block',
          px: 1.5,
          py: 0.25,
          borderRadius: t => t.shape.customBorderRadius?.sm ?? 4,
          fontSize: '0.75rem',
          fontVariantNumeric: 'tabular-nums',
          bgcolor: 'action.hover'
        }}
      >
        #{info.getValue()}
      </Box>
    ),
    enableSorting: false
  })
]
