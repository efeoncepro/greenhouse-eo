'use client'

import type { ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import OperationalStatusBadge, { type OperationalStatusTone } from './OperationalStatusBadge'

export interface MetricSummaryCardProps {
  title: ReactNode
  value: ReactNode
  subtitle?: ReactNode
  icon: string
  iconColor?: ThemeColor
  tooltip?: string
  statusLabel?: ReactNode
  statusTone?: OperationalStatusTone
  statusIcon?: string
}

/**
 * Consistent metric card for operational dashboards.
 *
 * Keeps null/empty values honest by letting callers pass fallback copy instead
 * of coercing missing data into numeric zeroes.
 */
const MetricSummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'primary',
  tooltip,
  statusLabel,
  statusTone = 'secondary',
  statusIcon
}: MetricSummaryCardProps) => {
  const titleNode = (
    <Stack direction='row' spacing={1} alignItems='center' sx={{ minWidth: 0 }}>
      <Typography variant='subtitle1' sx={{ fontWeight: 600 }} noWrap>
        {title}
      </Typography>
      {tooltip ? (
        <Tooltip title={tooltip}>
          <i className='tabler-info-circle' style={{ fontSize: 16 }} aria-label={tooltip} />
        </Tooltip>
      ) : null}
    </Stack>
  )

  return (
    <Card
      sx={theme => ({
        height: '100%',
        borderRadius: `${theme.shape.customBorderRadius.lg}px`
      })}
    >
      <CardContent>
        <Stack spacing={4} sx={{ minHeight: 124 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              {titleNode}
              <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
              {subtitle ? (
                <Typography variant='body2' color='text.secondary'>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            <CustomAvatar skin='light' color={iconColor} variant='rounded'>
              <i className={icon} aria-hidden='true' />
            </CustomAvatar>
          </Stack>
          {statusLabel ? (
            <OperationalStatusBadge label={statusLabel} tone={statusTone} icon={statusIcon} />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default MetricSummaryCard
