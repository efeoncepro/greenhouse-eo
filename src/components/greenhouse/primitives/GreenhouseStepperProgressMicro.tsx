'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'

export type GreenhouseStepperProgressState = 'pending' | 'active' | 'complete' | 'warning' | 'error' | 'blocked'
export type GreenhouseStepperProgressVariant = 'horizontal' | 'vertical' | 'compact'

export type GreenhouseStepperProgressStep = {
  id: string
  label: ReactNode
  description?: ReactNode
  state: GreenhouseStepperProgressState
  meta?: ReactNode
}

export type GreenhouseStepperProgressMicroProps = {
  steps: GreenhouseStepperProgressStep[]
  variant?: GreenhouseStepperProgressVariant
  title?: ReactNode
  description?: ReactNode
  ariaLabel?: string
  dataCapture?: string
}

const STATE_META: Record<GreenhouseStepperProgressState, { icon: string; tone: 'success' | 'warning' | 'error' | 'info' | 'primary' | null }> = {
  pending: { icon: 'tabler-circle', tone: null },
  active: { icon: 'tabler-loader-2', tone: 'primary' },
  complete: { icon: 'tabler-check', tone: 'success' },
  warning: { icon: 'tabler-alert-triangle', tone: 'warning' },
  error: { icon: 'tabler-alert-circle', tone: 'error' },
  blocked: { icon: 'tabler-lock', tone: 'error' }
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const getMain = (theme: Theme, state: GreenhouseStepperProgressState) => {
  const tone = STATE_META[state].tone

  return tone ? theme.palette[tone].main : theme.palette.text.disabled
}

const getCompletedRatio = (steps: GreenhouseStepperProgressStep[]) => {
  if (steps.length === 0) return 0

  return steps.filter(step => step.state === 'complete').length / steps.length
}

const StepIcon = ({ state }: { state: GreenhouseStepperProgressState }) => {
  const reduced = useReducedMotion()
  const meta = STATE_META[state]

  return (
    <Box
      aria-hidden='true'
      sx={theme => {
        const main = getMain(theme, state)

        return {
          display: 'grid',
          placeItems: 'center',
          width: 26,
          height: 26,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          color: state === 'pending' ? theme.palette.text.secondary : main,
          border: `1px solid ${state === 'pending' ? alpha(theme.palette.text.primary, 0.12) : alpha(main, 0.28)}`,
          backgroundColor: state === 'pending' ? alpha(theme.palette.text.primary, 0.018) : alpha(main, 0.07),
          flexShrink: 0,
          overflow: 'hidden'
        }
      }}
    >
      <Box
        component='i'
        className={meta.icon}
        sx={{
          display: 'block',
          fontSize: 16,
          lineHeight: 1,
          animation: state === 'active' && !reduced ? `gh-stepper-spin 900ms ${MOTION_EASING} infinite` : undefined,
          '&::before': { display: 'block' }
        }}
      />
    </Box>
  )
}

const GreenhouseStepperProgressMicro = ({
  steps,
  variant = 'horizontal',
  title,
  description,
  ariaLabel,
  dataCapture
}: GreenhouseStepperProgressMicroProps) => {
  const reduced = useReducedMotion()
  const isVertical = variant === 'vertical'
  const isCompact = variant === 'compact'
  const completedRatio = getCompletedRatio(steps)
  const activeIndex = steps.findIndex(step => step.state === 'active' || step.state === 'warning' || step.state === 'error' || step.state === 'blocked')
  const live = steps.some(step => step.state === 'error' || step.state === 'blocked') ? 'assertive' : 'polite'
  const role = live === 'assertive' ? 'alert' : 'status'

  return (
    <Stack
      spacing={isCompact ? 1.5 : 2}
      role={role}
      aria-live={live}
      aria-label={ariaLabel}
      data-variant={variant}
      data-capture={dataCapture}
      sx={theme => ({
        p: isCompact ? 1.5 : 2,
        border: `1px solid ${alpha(theme.palette.text.primary, 0.09)}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        backgroundColor: alpha(theme.palette.background.paper, 0.94),
        '@keyframes gh-stepper-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      })}
    >
      {title || description ? (
        <Stack spacing={0.25}>
          {title ? (
            <Typography variant='body2' sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
          ) : null}
          {description ? (
            <Typography variant='caption' color='text.secondary'>
              {description}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {!isVertical ? (
        <Box
          aria-hidden='true'
          sx={theme => ({
            height: 3,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.text.primary, 0.06),
            overflow: 'hidden'
          })}
        >
          <Box
            sx={theme => ({
              width: `${Math.round(completedRatio * 100)}%`,
              height: '100%',
              borderRadius: 999,
              backgroundColor: theme.palette.success.main,
              transition: reduced ? 'none' : `width 300ms ${MOTION_EASING}`
            })}
          />
        </Box>
      ) : null}

      <Stack
        component='ol'
        spacing={isVertical ? 1.5 : 1}
        sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
          display: isVertical ? 'flex' : 'grid',
          gridTemplateColumns: isCompact ? '1fr' : { xs: '1fr', md: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))` }
        }}
      >
        {steps.map((step, index) => {
          const isCurrent = index === activeIndex
          const mainState = step.state

          return (
            <Box
              key={step.id}
              component='li'
              aria-current={isCurrent ? 'step' : undefined}
              data-state={step.state}
              sx={theme => {
                const main = getMain(theme, mainState)

                return {
                  position: 'relative',
                  minWidth: 0,
                  p: isCompact ? 1 : 1.25,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${isCurrent ? alpha(main, 0.28) : 'transparent'}`,
                  backgroundColor: isCurrent ? alpha(main, 0.04) : 'transparent',
                  transition: reduced
                    ? 'none'
                    : theme.transitions.create(['background-color', 'border-color'], {
                        duration: 150,
                        easing: MOTION_EASING
                      })
                }
              }}
            >
              <Stack direction='row' spacing={1.25} alignItems='flex-start'>
                <StepIcon state={step.state} />
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography variant='body2' sx={{ fontWeight: isCurrent ? 800 : 700 }}>
                    {step.label}
                  </Typography>
                  {!isCompact && step.description ? (
                    <Typography variant='caption' color='text.secondary'>
                      {step.description}
                    </Typography>
                  ) : null}
                  {step.meta ? (
                    <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {step.meta}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </Stack>
  )
}

export default GreenhouseStepperProgressMicro
