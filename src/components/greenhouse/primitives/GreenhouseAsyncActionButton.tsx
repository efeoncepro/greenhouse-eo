'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import useReducedMotion from '@/hooks/useReducedMotion'

export type GreenhouseAsyncActionState = 'idle' | 'loading' | 'success' | 'error'

export type GreenhouseAsyncActionButtonProps = Omit<ButtonProps, 'children' | 'startIcon'> & {
  state?: GreenhouseAsyncActionState
  children: ReactNode
  loadingLabel?: ReactNode
  successLabel?: ReactNode
  errorLabel?: ReactNode
  startIcon?: ReactNode
  successIcon?: ReactNode
  errorIcon?: ReactNode
  disableWhileLoading?: boolean
  reserveWidth?: boolean
  statusLabel?: string
}

const STATE_ICON_CLASS: Record<Exclude<GreenhouseAsyncActionState, 'idle' | 'loading'>, string> = {
  success: 'tabler-circle-check',
  error: 'tabler-alert-circle'
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const getVisibleLabel = ({
  state,
  children,
  loadingLabel,
  successLabel,
  errorLabel
}: Pick<GreenhouseAsyncActionButtonProps, 'children' | 'loadingLabel' | 'successLabel' | 'errorLabel'> & {
  state: GreenhouseAsyncActionState
}) => {
  if (state === 'loading') return loadingLabel ?? children
  if (state === 'success') return successLabel ?? children
  if (state === 'error') return errorLabel ?? children

  return children
}

const GreenhouseAsyncActionButton = ({
  state = 'idle',
  children,
  loadingLabel,
  successLabel,
  errorLabel,
  startIcon,
  successIcon,
  errorIcon,
  disableWhileLoading = true,
  reserveWidth = true,
  disabled,
  statusLabel,
  color,
  variant = 'contained',
  sx,
  ...buttonProps
}: GreenhouseAsyncActionButtonProps) => {
  const reduced = useReducedMotion()
  const isLoading = state === 'loading'
  const resolvedLabel = getVisibleLabel({ state, children, loadingLabel, successLabel, errorLabel })
  const resolvedColor = color ?? (state === 'success' ? 'success' : state === 'error' ? 'error' : 'primary')

  const resolvedIcon =
    state === 'loading' ? (
      <Box component='span' className='gh-async-spinner' aria-hidden='true' />
    ) : state === 'success' ? (
      successIcon ?? <i className={STATE_ICON_CLASS.success} />
    ) : state === 'error' ? (
      errorIcon ?? <i className={STATE_ICON_CLASS.error} />
    ) : (
      startIcon
    )

  return (
    <Button
      {...buttonProps}
      variant={variant}
      color={resolvedColor}
      disabled={disabled || (disableWhileLoading && isLoading)}
      startIcon={resolvedIcon}
      aria-busy={isLoading ? 'true' : undefined}
      aria-live='polite'
      data-state={state}
      sx={[
        theme => ({
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          minWidth: reserveWidth ? 136 : undefined,
          fontWeight: 700,
          boxShadow: variant === 'contained' ? `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.22)}` : undefined,
          transition: reduced
            ? 'none'
            : theme.transitions.create(['box-shadow', 'transform', 'background-color', 'border-color'], {
                duration: 180,
                easing: MOTION_EASING
              }),
          '& .MuiButton-startIcon': {
            position: 'relative',
            zIndex: 1
          },
          '& .MuiButton-startIcon > i': {
            fontSize: 18,
            filter: variant === 'contained' ? `drop-shadow(0 1px 0 ${alpha(theme.palette.common.white, 0.2)})` : undefined,
            transformOrigin: '50% 50%'
          },
          '& .gh-async-spinner': {
            width: 16,
            height: 16,
            display: 'inline-block',
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderBlockStartColor: 'transparent',
            opacity: 0.92,
            filter: variant === 'contained' ? `drop-shadow(0 1px 0 ${alpha(theme.palette.common.white, 0.18)})` : undefined,
            animation: reduced ? 'none' : `gh-async-spinner-spin 780ms ${MOTION_EASING} infinite`
          },
          '&::before':
            variant === 'contained'
              ? {
                  content: '""',
                  position: 'absolute',
                  inset: 1,
                  zIndex: 0,
                  borderRadius: 'inherit',
                  pointerEvents: 'none',
                  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.3)}, inset 0 -1px 0 ${alpha(theme.palette.common.black, 0.08)}`
                }
              : undefined,
          '&:not(.Mui-disabled)': {
            ...(variant === 'contained'
              ? {
                  boxShadow: [
                    `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.24)}`,
                    `0 8px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.24 : 0.12)}`
                  ].join(', ')
                }
              : null)
          },
          '&:not(.Mui-disabled):hover': {
            transform: reduced ? undefined : 'translateY(-1px)',
            ...(variant === 'contained'
              ? {
                  boxShadow: [
                    `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.28)}`,
                    `0 12px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.16)}`
                  ].join(', ')
                }
              : null)
          },
          '&:not(.Mui-disabled):active': {
            transform: reduced ? undefined : 'translateY(0) scale(0.985)',
            ...(variant === 'contained'
              ? {
                  boxShadow: [
                    `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.16)}`,
                    `0 5px 12px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.12)}`
                  ].join(', ')
                }
              : null)
          },
          '&.Mui-focusVisible': {
            boxShadow: [
              variant === 'contained' ? `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.24)}` : undefined,
              `0 0 0 3px ${alpha(theme.palette[resolvedColor === 'inherit' ? 'primary' : resolvedColor].main, 0.24)}`
            ]
              .filter(Boolean)
              .join(', ')
          },
          ...(state === 'success'
            ? {
                boxShadow:
                  variant === 'contained'
                    ? [
                        `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.24)}`,
                        `0 0 0 3px ${alpha(theme.palette.success.main, 0.16)}`,
                        `0 10px 22px ${alpha(theme.palette.success.main, 0.2)}`
                      ].join(', ')
                    : `0 0 0 3px ${alpha(theme.palette.success.main, 0.14)}`,
                '& .MuiButton-startIcon > i': {
                  animation: reduced ? 'none' : `gh-async-success-pop 260ms ${MOTION_EASING} both`
                }
              }
            : null),
          ...(state === 'error'
            ? {
                boxShadow:
                  variant === 'contained'
                    ? [
                        `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.24)}`,
                        `0 0 0 3px ${alpha(theme.palette.error.main, 0.16)}`,
                        `0 10px 22px ${alpha(theme.palette.error.main, 0.18)}`
                      ].join(', ')
                    : `0 0 0 3px ${alpha(theme.palette.error.main, 0.14)}`,
                '& .MuiButton-startIcon > i': {
                  animation: reduced ? 'none' : `gh-async-error-pop 220ms ${MOTION_EASING} both`
                }
              }
            : null),
          ...(isLoading
            ? (() => {
                const statePalette =
                  resolvedColor === 'secondary'
                    ? theme.palette.secondary
                    : resolvedColor === 'success'
                      ? theme.palette.success
                      : resolvedColor === 'warning'
                        ? theme.palette.warning
                        : resolvedColor === 'error'
                          ? theme.palette.error
                          : resolvedColor === 'info'
                            ? theme.palette.info
                            : theme.palette.primary

                return {
                  '&.Mui-disabled': {
                    opacity: 1,
                    color: variant === 'contained' ? statePalette.contrastText : statePalette.main,
                    borderColor: variant === 'outlined' ? alpha(statePalette.main, 0.46) : undefined,
                    boxShadow:
                      variant === 'contained'
                        ? [
                            `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.2)}`,
                            `0 0 0 3px ${alpha(statePalette.main, 0.12)}`,
                            `0 8px 18px ${alpha(statePalette.main, 0.18)}`
                          ].join(', ')
                        : undefined,
                    backgroundColor:
                      variant === 'contained'
                        ? statePalette.main
                        : variant === 'outlined'
                          ? alpha(statePalette.main, 0.08)
                          : alpha(statePalette.main, 0.14)
                  }
                }
              })()
            : null),
          '&::after': isLoading
            ? {
                content: '""',
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                transform: 'translateX(-120%) skewX(-12deg)',
                background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
                animation: reduced ? 'none' : `gh-async-button-scan 1300ms ${MOTION_EASING} infinite`
              }
            : undefined,
          '@keyframes gh-async-button-scan': {
            '0%': { transform: 'translateX(-120%) skewX(-12deg)' },
            '55%': { transform: 'translateX(160%) skewX(-12deg)' },
            '100%': { transform: 'translateX(160%) skewX(-12deg)' }
          },
          '@keyframes gh-async-spinner-spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          },
          '@keyframes gh-async-success-pop': {
            '0%': { transform: 'scale(0.82)', opacity: 0.72 },
            '100%': { transform: 'scale(1)', opacity: 1 }
          },
          '@keyframes gh-async-error-pop': {
            '0%': { transform: 'scale(0.9)', opacity: 0.76 },
            '100%': { transform: 'scale(1)', opacity: 1 }
          }
        }),
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      <Box component='span' sx={{ position: 'relative', zIndex: 1 }}>
        {resolvedLabel}
      </Box>
      <Box component='span' sx={visuallyHidden}>
        {statusLabel ?? (typeof resolvedLabel === 'string' ? resolvedLabel : state)}
      </Box>
    </Button>
  )
}

export default GreenhouseAsyncActionButton
