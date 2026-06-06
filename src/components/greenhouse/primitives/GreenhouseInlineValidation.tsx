'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ButtonProps } from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

export type GreenhouseInlineValidationState = 'idle' | 'checking' | 'valid' | 'warning' | 'error' | 'blocked'
export type GreenhouseInlineValidationVariant = 'field' | 'section' | 'summary' | 'asyncCheck'

export type GreenhouseInlineValidationProps = {
  state: GreenhouseInlineValidationState
  variant?: GreenhouseInlineValidationVariant
  message: ReactNode
  detail?: ReactNode
  meta?: ReactNode
  actionLabel?: ReactNode
  onAction?: ButtonProps['onClick']
  actionIcon?: ReactNode
  dataCapture?: string
  ariaLabel?: string
}

type ValidationMeta = {
  icon: string
  color: 'success' | 'warning' | 'error' | 'info' | 'primary' | null
  role: 'status' | 'alert'
  live: 'polite' | 'assertive'
}

const STATE_META: Record<GreenhouseInlineValidationState, ValidationMeta> = {
  idle: { icon: 'tabler-circle-dashed', color: null, role: 'status', live: 'polite' },
  checking: { icon: 'tabler-loader-2', color: 'primary', role: 'status', live: 'polite' },
  valid: { icon: 'tabler-circle-check', color: 'success', role: 'status', live: 'polite' },
  warning: { icon: 'tabler-alert-triangle', color: 'warning', role: 'status', live: 'polite' },
  error: { icon: 'tabler-alert-circle', color: 'error', role: 'alert', live: 'assertive' },
  blocked: { icon: 'tabler-lock', color: 'error', role: 'alert', live: 'assertive' }
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const getColor = (theme: Theme, meta: ValidationMeta) => (meta.color ? theme.palette[meta.color].main : theme.palette.text.secondary)

const GreenhouseInlineValidation = ({
  state,
  variant = 'field',
  message,
  detail,
  meta,
  actionLabel,
  onAction,
  actionIcon,
  dataCapture,
  ariaLabel
}: GreenhouseInlineValidationProps) => {
  const reduced = useReducedMotion()
  const stateMeta = STATE_META[state]
  const isField = variant === 'field'
  const isSummary = variant === 'summary'
  const isAsyncCheck = variant === 'asyncCheck'
  const isChecking = state === 'checking'

  const icon = (
    <Box
      aria-hidden='true'
      sx={theme => {
        const main = getColor(theme, stateMeta)

        return {
          display: 'grid',
          placeItems: 'center',
          width: isField ? 26 : 32,
          height: isField ? 26 : 32,
          borderRadius: `${isField ? theme.shape.customBorderRadius.sm : theme.shape.customBorderRadius.md}px`,
          flexShrink: 0,
          color: main,
          border: isField ? `1px solid ${alpha(main, state === 'idle' ? 0.14 : 0.3)}` : undefined,
          backgroundColor: alpha(main, isField ? (state === 'idle' ? 0.018 : 0.06) : state === 'idle' ? 0.07 : 0.12),
          overflow: 'hidden'
        }
      }}
    >
      <Box
        component='i'
        className={stateMeta.icon}
        sx={{
          display: 'block',
          fontSize: isField ? 16 : 19,
          lineHeight: 1,
          animation: isChecking && !reduced ? `gh-inline-validation-spin 900ms ${MOTION_EASING} infinite` : undefined,
          '&::before': {
            display: 'block'
          }
        }}
      />
    </Box>
  )

  const text = (
    <Stack spacing={isField ? 0.25 : 0.5} sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant={isSummary ? 'h6' : 'body2'} sx={{ fontWeight: isField ? 700 : 800, lineHeight: 1.35 }}>
        {message}
      </Typography>
      {detail ? (
        <Typography variant='body2' color='text.secondary'>
          {detail}
        </Typography>
      ) : null}
      {meta ? (
        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {meta}
        </Typography>
      ) : null}
    </Stack>
  )

  const action = actionLabel ? (
    <Box sx={{ flexShrink: 0 }}>
      <Button
        type='button'
        size='small'
        variant='tonal'
        color={stateMeta.color ?? 'primary'}
        startIcon={actionIcon}
        onClick={onAction}
        sx={{
          '& .MuiButton-startIcon > i': {
            fontSize: 18
          }
        }}
      >
        {actionLabel}
      </Button>
    </Box>
  ) : null

  const content = (
    <Stack spacing={isAsyncCheck ? 1.25 : 0.75} sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction={{ xs: 'column', sm: isSummary ? 'row' : 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'flex-start' }}>
        <Stack direction='row' spacing={1.25} alignItems='flex-start' sx={{ minWidth: 0, flex: 1 }}>
          {icon}
          {text}
        </Stack>
        {action}
      </Stack>
      {isAsyncCheck ? (
        <LinearProgress
          variant={isChecking ? 'indeterminate' : 'determinate'}
          value={isChecking ? undefined : state === 'valid' ? 100 : state === 'idle' ? 0 : 72}
          color={stateMeta.color ?? 'primary'}
          sx={theme => ({
            height: 4,
            borderRadius: 999,
            backgroundColor: alpha(getColor(theme, stateMeta), 0.12),
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              transition: reduced ? 'none' : undefined
            }
          })}
        />
      ) : null}
    </Stack>
  )

  const sharedProps = {
    role: stateMeta.role,
    'aria-live': stateMeta.live,
    'aria-label': ariaLabel,
    'data-state': state,
    'data-variant': variant,
    'data-capture': dataCapture
  } as const

  if (isField) {
    return (
      <Box
        {...sharedProps}
        sx={theme => {
          const main = getColor(theme, stateMeta)

          return {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.25,
            color: state === 'idle' ? 'text.secondary' : undefined,
            px: 1.5,
            py: 1.25,
            border: `1px solid ${state === 'idle' ? alpha(theme.palette.text.primary, 0.08) : alpha(main, 0.14)}`,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            backgroundColor: state === 'idle' ? 'transparent' : alpha(main, 0.018),
            animation: state !== 'idle' && !reduced ? `gh-inline-validation-enter 220ms ${MOTION_EASING} both` : undefined,
            '@keyframes gh-inline-validation-enter': {
              '0%': { transform: 'translateY(-1px)', opacity: 0.78 },
              '100%': { transform: 'translateY(0)', opacity: 1 }
            },
            '@keyframes gh-inline-validation-spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
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
        const main = getColor(theme, stateMeta)

        return {
          position: 'relative',
          overflow: 'hidden',
          borderColor: state === 'idle' ? alpha(theme.palette.divider, 0.92) : alpha(main, stateMeta.role === 'alert' ? 0.36 : 0.28),
          backgroundColor: state === 'idle' ? alpha(theme.palette.background.paper, 0.88) : alpha(main, isSummary ? 0.06 : 0.048),
          boxShadow: isChecking ? `0 0 0 3px ${alpha(main, 0.08)}` : undefined,
          animation: state !== 'idle' && !reduced ? `gh-inline-validation-enter 260ms ${MOTION_EASING} both` : undefined,
          '@keyframes gh-inline-validation-enter': {
            '0%': { transform: 'translateY(-1px)', opacity: 0.78 },
            '100%': { transform: 'translateY(0)', opacity: 1 }
          },
          '@keyframes gh-inline-validation-spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          }
        }
      }}
    >
      <CardContent sx={{ p: isSummary ? 3 : 2.5 }}>{content}</CardContent>
    </Card>
  )
}

export default GreenhouseInlineValidation
