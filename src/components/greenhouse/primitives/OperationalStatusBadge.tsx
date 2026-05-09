'use client'

import type { ReactNode } from 'react'

import CustomChip from '@core/components/mui/Chip'
import type { ThemeColor } from '@core/types'

export type OperationalStatusTone = Extract<ThemeColor, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'>

export interface OperationalStatusBadgeProps {
  label: ReactNode
  tone?: OperationalStatusTone
  icon?: string
  ariaLabel?: string
}

/**
 * Compact operational state badge.
 *
 * Use for real states only: healthy, warning, blocked, neutral, pending. The
 * shape stays pill-like because the badge is small; larger containers should
 * use OperationalPanel/OperationalSignalList instead of pill cards.
 */
const OperationalStatusBadge = ({
  label,
  tone = 'secondary',
  icon,
  ariaLabel
}: OperationalStatusBadgeProps) => (
  <CustomChip
    round='true'
    size='small'
    color={tone}
    variant='tonal'
    icon={icon ? <i className={icon} aria-hidden='true' /> : undefined}
    label={label}
    aria-label={ariaLabel}
    sx={{
      '& .MuiChip-label': {
        px: 2
      }
    }}
  />
)

export default OperationalStatusBadge
