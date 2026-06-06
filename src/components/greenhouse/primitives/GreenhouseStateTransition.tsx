'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

export type GreenhouseStateTransitionTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'
export type GreenhouseStateTransitionVariant = 'surface' | 'inline'

export type GreenhouseStateTransitionProps = {
  tone: GreenhouseStateTransitionTone
  fromLabel: ReactNode
  toLabel: ReactNode
  title: ReactNode
  description?: ReactNode
  timestamp?: ReactNode
  referenceId?: ReactNode
  variant?: GreenhouseStateTransitionVariant
  active?: boolean
  ariaLabel?: string
  dataCapture?: string
}

const TONE_META: Record<GreenhouseStateTransitionTone, { icon: string; color: 'success' | 'warning' | 'error' | 'info' | null }> = {
  success: { icon: 'tabler-circle-check', color: 'success' },
  warning: { icon: 'tabler-alert-triangle', color: 'warning' },
  error: { icon: 'tabler-alert-circle', color: 'error' },
  info: { icon: 'tabler-info-circle', color: 'info' },
  neutral: { icon: 'tabler-arrows-exchange', color: null }
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const GreenhouseStateTransition = ({
  tone,
  fromLabel,
  toLabel,
  title,
  description,
  timestamp,
  referenceId,
  variant = 'surface',
  active = true,
  ariaLabel,
  dataCapture
}: GreenhouseStateTransitionProps) => {
  const reduced = useReducedMotion()
  const meta = TONE_META[tone]
  const isInline = variant === 'inline'
  const role = tone === 'error' ? 'alert' : 'status'
  const ariaLive = tone === 'error' ? 'assertive' : 'polite'

  const content = (
    <Stack spacing={isInline ? 1 : 1.5} sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction='row' spacing={1.5} alignItems='flex-start'>
        <Box
          aria-hidden='true'
          component='i'
          className={meta.icon}
          sx={theme => {
            const main = meta.color ? theme.palette[meta.color].main : theme.palette.text.secondary

            return {
              display: 'grid',
              placeItems: 'center',
              width: isInline ? 28 : 34,
              height: isInline ? 28 : 34,
              borderRadius: theme.shape.customBorderRadius.md,
              flexShrink: 0,
              color: main,
              backgroundColor: alpha(main, tone === 'neutral' ? 0.08 : 0.12),
              fontSize: isInline ? 17 : 20,
              animation: active && !reduced ? `gh-state-transition-icon 240ms ${MOTION_EASING} both` : 'none'
            }
          }}
        />
        <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant={isInline ? 'body2' : 'h6'} sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant='body2' color='text.secondary'>
              {description}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
        <Box
          component='span'
          sx={theme => ({
            maxWidth: '100%',
            px: 2,
            py: 0.75,
            borderRadius: 999,
            color: 'text.secondary',
            backgroundColor: alpha(theme.palette.text.primary, 0.055),
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 800,
            lineHeight: 1.35
          })}
        >
          {fromLabel}
        </Box>
        <Box
          aria-hidden='true'
          component='i'
          className='tabler-arrow-right'
          sx={theme => ({
            color: meta.color ? theme.palette[meta.color].main : theme.palette.text.secondary,
            fontSize: 18,
            flexShrink: 0
          })}
        />
        <Box
          component='span'
          sx={theme => {
            const main = meta.color ? theme.palette[meta.color].main : theme.palette.text.primary

            return {
              maxWidth: '100%',
              position: 'relative',
              px: 2,
              py: 0.75,
              borderRadius: 999,
              color: tone === 'warning' || tone === 'success' || tone === 'info' ? theme.palette.text.primary : main,
              backgroundColor: alpha(main, tone === 'neutral' ? 0.075 : 0.13),
              boxShadow: active ? `0 0 0 3px ${alpha(main, tone === 'neutral' ? 0.07 : 0.1)}` : undefined,
              fontSize: theme.typography.caption.fontSize,
              fontWeight: 900,
              lineHeight: 1.35,
              animation: active && !reduced ? `gh-state-transition-highlight 720ms ${MOTION_EASING} both` : 'none'
            }
          }}
        >
          {toLabel}
        </Box>
      </Stack>

      {timestamp || referenceId ? (
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          {timestamp ? (
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
              {timestamp}
            </Typography>
          ) : null}
          {referenceId ? (
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {referenceId}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  )

  const sharedProps = {
    role,
    'aria-live': ariaLive,
    'aria-label': ariaLabel,
    'data-tone': tone,
    'data-transition': `${String(fromLabel)} -> ${String(toLabel)}`,
    'data-active': active ? 'true' : 'false',
    'data-capture': dataCapture
  } as const

  if (isInline) {
    return (
      <Box
        {...sharedProps}
        sx={theme => {
          const main = meta.color ? theme.palette[meta.color].main : theme.palette.divider

          return {
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            p: 2,
            border: `1px solid ${alpha(main, tone === 'neutral' ? 0.18 : 0.26)}`,
            borderRadius: theme.shape.customBorderRadius.lg,
            backgroundColor: alpha(main, tone === 'neutral' ? 0.025 : 0.045),
            boxShadow: active ? `0 0 0 3px ${alpha(main, tone === 'neutral' ? 0.045 : 0.075)}` : undefined,
            animation: active && !reduced ? `gh-state-transition-surface 620ms ${MOTION_EASING} both` : 'none',
            '@keyframes gh-state-transition-surface': {
              '0%': { transform: 'translateY(2px)', opacity: 0.84 },
              '100%': { transform: 'translateY(0)', opacity: 1 }
            },
            '@keyframes gh-state-transition-icon': {
              '0%': { transform: 'scale(0.86)', opacity: 0.72 },
              '100%': { transform: 'scale(1)', opacity: 1 }
            },
            '@keyframes gh-state-transition-highlight': {
              '0%': { transform: 'scale(0.96)' },
              '100%': { transform: 'scale(1)' }
            }
          }
        }}
      >
        {content}
      </Box>
    )
  }

  return (
    <Card
      {...sharedProps}
      variant='outlined'
      sx={theme => {
        const main = meta.color ? theme.palette[meta.color].main : theme.palette.divider

        return {
          position: 'relative',
          overflow: 'hidden',
          borderColor: alpha(main, tone === 'neutral' ? 0.2 : 0.28),
          backgroundColor: alpha(main, tone === 'neutral' ? 0.025 : 0.052),
          boxShadow: active ? `0 0 0 3px ${alpha(main, tone === 'neutral' ? 0.05 : 0.085)}` : undefined,
          animation: active && !reduced ? `gh-state-transition-surface 620ms ${MOTION_EASING} both` : 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            insetBlock: 0,
            insetInlineStart: 0,
            width: 3,
            backgroundColor: meta.color ? theme.palette[meta.color].main : theme.palette.text.secondary
          },
          '@keyframes gh-state-transition-surface': {
            '0%': { transform: 'translateY(2px)', opacity: 0.84 },
            '100%': { transform: 'translateY(0)', opacity: 1 }
          },
          '@keyframes gh-state-transition-icon': {
            '0%': { transform: 'scale(0.86)', opacity: 0.72 },
            '100%': { transform: 'scale(1)', opacity: 1 }
          },
          '@keyframes gh-state-transition-highlight': {
            '0%': { transform: 'scale(0.96)' },
            '100%': { transform: 'scale(1)' }
          }
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>{content}</CardContent>
    </Card>
  )
}

export default GreenhouseStateTransition
