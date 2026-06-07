'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

import GreenhouseButton, { type GreenhouseButtonProps } from './GreenhouseButton'
import GreenhouseChip, { type GreenhouseChipTone } from './GreenhouseChip'

export type GreenhouseInlineDecisionTone = 'info' | 'warning' | 'error' | 'success' | 'neutral'
export type GreenhouseInlineDecisionState = 'idle' | 'reviewing' | 'submitting' | 'confirmed' | 'blocked'
export type GreenhouseInlineDecisionVariant = 'choice' | 'confirmation' | 'impact'

export type GreenhouseInlineDecisionPromptProps = {
  tone?: GreenhouseInlineDecisionTone
  state?: GreenhouseInlineDecisionState
  variant?: GreenhouseInlineDecisionVariant
  title: ReactNode
  description?: ReactNode
  impactItems?: ReactNode[]
  primaryLabel: ReactNode
  secondaryLabel?: ReactNode
  tertiaryLabel?: ReactNode
  onPrimary?: GreenhouseButtonProps['onClick']
  onSecondary?: GreenhouseButtonProps['onClick']
  onTertiary?: GreenhouseButtonProps['onClick']
  primaryIcon?: ReactNode
  secondaryIcon?: ReactNode
  tertiaryIcon?: ReactNode
  meta?: ReactNode
  ariaLabel?: string
  dataCapture?: string
}

const TONE_META: Record<GreenhouseInlineDecisionTone, { icon: string; color: 'info' | 'warning' | 'error' | 'success' | 'primary' | null }> = {
  info: { icon: 'tabler-info-circle', color: 'info' },
  warning: { icon: 'tabler-alert-triangle', color: 'warning' },
  error: { icon: 'tabler-alert-circle', color: 'error' },
  success: { icon: 'tabler-circle-check', color: 'success' },
  neutral: { icon: 'tabler-route', color: null }
}

const STATE_LABEL: Record<GreenhouseInlineDecisionState, string> = {
  idle: 'Decision pendiente',
  reviewing: 'Revisando impacto',
  submitting: 'Aplicando decision',
  confirmed: 'Decision aplicada',
  blocked: 'Decision bloqueada'
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const ICON_SIZE = {
  bullet: 14,
  prompt: 20,
  spinner: 14
} as const

const getMain = (theme: Theme, tone: GreenhouseInlineDecisionTone) => {
  const color = TONE_META[tone].color

  return color ? theme.palette[color].main : theme.palette.text.secondary
}

const toChipTone = (tone: GreenhouseInlineDecisionTone): GreenhouseChipTone => (tone === 'neutral' ? 'default' : tone)

const GreenhouseInlineDecisionPrompt = ({
  tone = 'info',
  state = 'idle',
  variant = 'choice',
  title,
  description,
  impactItems = [],
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimary,
  onSecondary,
  onTertiary,
  primaryIcon,
  secondaryIcon,
  tertiaryIcon,
  meta,
  ariaLabel,
  dataCapture
}: GreenhouseInlineDecisionPromptProps) => {
  const reduced = useReducedMotion()
  const isSubmitting = state === 'submitting'
  const isBlocked = state === 'blocked' || tone === 'error'
  const role = isBlocked ? 'alert' : 'status'
  const live = isBlocked ? 'assertive' : 'polite'
  const toneMeta = TONE_META[tone]

  return (
    <Box
      role={role}
      aria-live={live}
      aria-label={ariaLabel}
      data-state={state}
      data-tone={tone}
      data-variant={variant}
      data-capture={dataCapture}
      sx={theme => {
        const main = getMain(theme, tone)

        return {
          p: 2,
          border: `1px solid ${alpha(main, tone === 'neutral' ? 0.16 : 0.28)}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          backgroundColor: alpha(main, tone === 'neutral' ? 0.018 : 0.045),
          animation: !reduced ? `gh-inline-decision-enter 180ms ${MOTION_EASING} both` : undefined,
          '@keyframes gh-inline-decision-enter': {
            '0%': { transform: 'translateY(1px)', opacity: 0.86 },
            '100%': { transform: 'translateY(0)', opacity: 1 }
          }
        }
      }}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          <Stack direction='row' spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              aria-hidden='true'
              sx={theme => {
                const main = getMain(theme, tone)

                return {
                  display: 'grid',
                  placeItems: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  color: main,
                  border: `1px solid ${alpha(main, tone === 'neutral' ? 0.14 : 0.24)}`,
                  backgroundColor: alpha(main, tone === 'neutral' ? 0.035 : 0.075),
                  flexShrink: 0
                }
              }}
            >
              <Box component='i' className={toneMeta.icon} sx={{ fontSize: ICON_SIZE.prompt }} />
            </Box>
            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                <Typography variant='h6'>
                  {title}
                </Typography>
                <GreenhouseChip label={STATE_LABEL[state]} size='small' variant='label' tone={toChipTone(tone)} kind='status' />
              </Stack>
              {description ? (
                <Typography variant='caption' color='text.secondary'>
                  {description}
                </Typography>
              ) : null}
              {meta ? (
                <Typography variant='monoId' color='text.secondary'>
                  {meta}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            {tertiaryLabel ? (
              <GreenhouseButton
                type='button'
                size='small'
                variant='text'
                tone='secondary'
                kind='inlineAction'
                leadingIcon={tertiaryIcon}
                onClick={onTertiary}
                disabled={isSubmitting}
              >
                {tertiaryLabel}
              </GreenhouseButton>
            ) : null}
            {secondaryLabel ? (
              <GreenhouseButton
                type='button'
                size='small'
                variant='label'
                tone='secondary'
                kind='secondaryAction'
                leadingIcon={secondaryIcon}
                onClick={onSecondary}
                disabled={isSubmitting}
              >
                {secondaryLabel}
              </GreenhouseButton>
            ) : null}
            <GreenhouseButton
              type='button'
              size='small'
              variant='solid'
              tone={tone === 'error' ? 'error' : 'primary'}
              kind={tone === 'error' ? 'destructiveAction' : 'primaryAction'}
              leadingIcon={isSubmitting ? <CircularProgress size={ICON_SIZE.spinner} color='inherit' /> : primaryIcon}
              onClick={onPrimary}
              disabled={isSubmitting || state === 'blocked'}
            >
              {primaryLabel}
            </GreenhouseButton>
          </Stack>
        </Stack>

        {variant === 'impact' && impactItems.length > 0 ? (
          <Box
            component='ul'
            sx={{
              display: 'grid',
              gap: 1,
              p: 0,
              m: 0,
              listStyle: 'none',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }
            }}
          >
            {impactItems.map((item, index) => (
              <Box
                key={`decision-impact-${index}`}
                component='li'
                sx={theme => ({
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  backgroundColor: alpha(theme.palette.background.paper, 0.72)
                })}
              >
                <Box component='i' className='tabler-point-filled' aria-hidden='true' sx={{ mt: 0.5, color: 'text.secondary', fontSize: ICON_SIZE.bullet }} />
                <Typography variant='caption' color='text.secondary'>
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </Stack>
    </Box>
  )
}

export default GreenhouseInlineDecisionPrompt
