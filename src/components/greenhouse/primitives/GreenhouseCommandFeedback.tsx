'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

import GreenhouseButton, { type GreenhouseButtonProps } from './GreenhouseButton'

export type GreenhouseCommandFeedbackTone = 'success' | 'error' | 'warning' | 'info' | 'retrying'

export type GreenhouseCommandFeedbackProps = {
  tone: GreenhouseCommandFeedbackTone
  title: ReactNode
  description?: ReactNode
  actionLabel?: ReactNode
  onAction?: GreenhouseButtonProps['onClick']
  actionIcon?: ReactNode
  timestamp?: ReactNode
  referenceId?: ReactNode
  compact?: boolean
  dataCapture?: string
}

const TONE_META: Record<GreenhouseCommandFeedbackTone, { icon: string; color: 'success' | 'error' | 'warning' | 'info' | 'primary' }> = {
  success: { icon: 'tabler-circle-check', color: 'success' },
  error: { icon: 'tabler-alert-circle', color: 'error' },
  warning: { icon: 'tabler-alert-triangle', color: 'warning' },
  info: { icon: 'tabler-info-circle', color: 'info' },
  retrying: { icon: 'tabler-refresh', color: 'primary' }
}

const ICON_SIZE = {
  action: 18,
  compact: 18,
  default: 20
} as const

const GreenhouseCommandFeedback = ({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  timestamp,
  referenceId,
  compact = false,
  dataCapture
}: GreenhouseCommandFeedbackProps) => {
  const reduced = useReducedMotion()
  const meta = TONE_META[tone]

  return (
    <Card
      variant='outlined'
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      data-tone={tone}
      data-capture={dataCapture}
      sx={theme => {
        const palette = theme.palette[meta.color]

        return {
          overflow: 'hidden',
          borderColor: alpha(palette.main, tone === 'error' ? 0.38 : 0.26),
          backgroundColor: alpha(palette.main, compact ? 0.045 : 0.065),
          boxShadow: tone === 'retrying' ? `0 0 0 3px ${alpha(palette.main, 0.08)}` : undefined
        }
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 2.5 }}>
        <Stack direction='row' spacing={1.5} alignItems='flex-start'>
          <Box
            aria-hidden='true'
            component='i'
            className={meta.icon}
            sx={theme => {
              const palette = theme.palette[meta.color]

              return {
                display: 'grid',
                placeItems: 'center',
                width: compact ? 30 : 36,
                height: compact ? 30 : 36,
                borderRadius: 1.5,
                flexShrink: 0,
                color: palette.main,
                backgroundColor: alpha(palette.main, 0.12),
                fontSize: compact ? ICON_SIZE.compact : ICON_SIZE.default,
                animation: tone === 'retrying' && !reduced ? 'gh-command-feedback-spin 1500ms linear infinite' : 'none',
                '@keyframes gh-command-feedback-spin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' }
                }
              }
            }}
          />
          <Stack spacing={compact ? 1 : 1.25} sx={{ minWidth: 0, flex: 1 }}>
            <Stack spacing={0.35}>
              <Typography variant='h6'>
                {title}
              </Typography>
              {description ? (
                <Typography variant='body2' color='text.secondary'>
                  {description}
                </Typography>
              ) : null}
            </Stack>
            {timestamp || referenceId ? (
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {timestamp ? (
                  <Typography variant='caption' color='text.secondary'>
                    {timestamp}
                  </Typography>
                ) : null}
                {referenceId ? (
                  <Typography variant='monoId' color='text.secondary'>
                    {referenceId}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
            {actionLabel ? (
              <Box>
                <GreenhouseButton
                  type='button'
                  variant='label'
                  tone={meta.color}
                  kind='secondaryAction'
                  size='small'
                  leadingIcon={actionIcon}
                  onClick={onAction}
                  sx={{
                    '& .MuiButton-startIcon > i': {
                      fontSize: ICON_SIZE.action
                    }
                  }}
                >
                  {actionLabel}
                </GreenhouseButton>
              </Box>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default GreenhouseCommandFeedback
