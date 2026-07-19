'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import GreenhouseChip from '../GreenhouseChip'
import { resolveDetailHeroVariant } from './surface-system-controller'
import type { DetailHeroKind, DetailHeroVariant } from './surface-system-types'

export interface DetailHeroProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  statusLabel?: ReactNode
  statusTone?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
  metadata?: ReactNode
  actions?: ReactNode
  leading?: ReactNode
  variant?: DetailHeroVariant
  kind?: DetailHeroKind
  dataCapture?: string
}

const DetailHero = ({
  eyebrow,
  title,
  description,
  statusLabel,
  statusTone = 'default',
  metadata,
  actions,
  leading,
  variant,
  kind = 'entity',
  dataCapture
}: DetailHeroProps) => {
  const resolvedVariant = resolveDetailHeroVariant(kind, variant)

  return (
    <Stack
      component='section'
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface='contained'
      spacing={4}
      sx={theme => ({
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        background:
          resolvedVariant === 'evidence'
            ? `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.primary.lightOpacity})`
            : theme.palette.background.paper,
        border: '1px solid',
        borderColor: resolvedVariant === 'evidence' ? 'primary.lightOpacity' : 'divider',
        boxShadow: theme.greenhouseElevation.raised.boxShadow,
        p: { xs: 4, md: 5.5 }
      })}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={4}>
        <Stack direction='row' spacing={3} sx={{ minWidth: 0 }}>
          {leading ? <Box sx={{ flexShrink: 0 }}>{leading}</Box> : null}
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              {eyebrow ? (
                <Typography variant='overline' color='text.secondary'>
                  {eyebrow}
                </Typography>
              ) : null}
              {statusLabel ? <GreenhouseChip label={statusLabel} kind='status' variant='label' tone={statusTone} size='small' /> : null}
            </Stack>
            <Typography component='h2' variant={resolvedVariant === 'report' ? 'h4' : 'h5'} sx={{ textWrap: 'balance' }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 720 }}>
                {description}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
        {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
      </Stack>
      {metadata ? <Box sx={{ color: 'text.primary' }}>{metadata}</Box> : null}
    </Stack>
  )
}

export default DetailHero
