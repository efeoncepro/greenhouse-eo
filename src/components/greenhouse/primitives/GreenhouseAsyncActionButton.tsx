'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import type { ButtonProps } from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import useReducedMotion from '@/hooks/useReducedMotion'

import GreenhouseButton from './GreenhouseButton'
import type {
  GreenhouseButtonKind,
  GreenhouseButtonSize,
  GreenhouseButtonTone,
  GreenhouseButtonVariant
} from './greenhouse-button-controller'

export type GreenhouseAsyncActionState = 'idle' | 'loading' | 'success' | 'error'

export type GreenhouseAsyncActionButtonProps = Omit<
  ButtonProps,
  'children' | 'color' | 'endIcon' | 'size' | 'startIcon' | 'variant'
> & {
  state?: GreenhouseAsyncActionState
  children: ReactNode
  variant?: ButtonProps['variant']
  greenhouseVariant?: GreenhouseButtonVariant
  color?: ButtonProps['color']
  tone?: GreenhouseButtonTone
  kind?: GreenhouseButtonKind
  size?: GreenhouseButtonSize
  loadingLabel?: ReactNode
  successLabel?: ReactNode
  errorLabel?: ReactNode
  startIcon?: ReactNode
  successIcon?: ReactNode
  errorIcon?: ReactNode
  disableWhileLoading?: boolean
  reserveWidth?: boolean
  reserveInlineSize?: number
  statusLabel?: string
  dataCapture?: string
}

const STATE_ICON_CLASS: Record<Exclude<GreenhouseAsyncActionState, 'idle' | 'loading'>, string> = {
  success: 'tabler-circle-check',
  error: 'tabler-alert-circle'
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const LEGACY_VARIANT_TO_GREENHOUSE_VARIANT: Record<string, GreenhouseButtonVariant> = {
  contained: 'solid',
  tonal: 'label',
  outlined: 'outlined',
  text: 'text'
}

const LEGACY_COLOR_TO_GREENHOUSE_TONE: Record<string, GreenhouseButtonTone> = {
  primary: 'primary',
  secondary: 'secondary',
  error: 'error',
  warning: 'warning',
  info: 'info',
  success: 'success'
}

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

const resolveAsyncButtonVariant = ({
  greenhouseVariant,
  variant
}: {
  greenhouseVariant?: GreenhouseButtonVariant
  variant?: ButtonProps['variant']
}): GreenhouseButtonVariant => greenhouseVariant ?? LEGACY_VARIANT_TO_GREENHOUSE_VARIANT[String(variant ?? 'contained')] ?? 'solid'

const resolveAsyncButtonTone = ({
  color,
  state,
  tone
}: {
  color?: ButtonProps['color']
  state: GreenhouseAsyncActionState
  tone?: GreenhouseButtonTone
}): GreenhouseButtonTone => {
  if (tone) return tone

  const mappedColor = color ? LEGACY_COLOR_TO_GREENHOUSE_TONE[String(color)] : undefined

  if (mappedColor) return mappedColor
  if (state === 'success') return 'success'
  if (state === 'error') return 'error'

  return 'primary'
}

const toSxArray = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : sx ? [sx] : [])

const GreenhouseAsyncActionButton = ({
  state = 'idle',
  children,
  color,
  dataCapture,
  greenhouseVariant,
  kind = 'primaryAction',
  loadingLabel,
  successLabel,
  errorLabel,
  startIcon,
  successIcon,
  errorIcon,
  disableWhileLoading = true,
  reserveWidth = true,
  reserveInlineSize,
  disabled,
  statusLabel,
  tone,
  variant = 'contained',
  size = 'medium',
  sx,
  ...buttonProps
}: GreenhouseAsyncActionButtonProps) => {
  const reduced = useReducedMotion()
  const isLoading = state === 'loading'
  const resolvedLabel = getVisibleLabel({ state, children, loadingLabel, successLabel, errorLabel })
  const resolvedButtonVariant = resolveAsyncButtonVariant({ greenhouseVariant, variant })
  const resolvedTone = resolveAsyncButtonTone({ color, state, tone })
  const isSolid = resolvedButtonVariant === 'solid'
  const isOutlined = resolvedButtonVariant === 'outlined'

  const resolvedIcon =
    state === 'loading' ? (
      <Box component='span' className='gh-async-spinner' aria-hidden='true' />
    ) : state === 'success' ? (
      successIcon ?? <i aria-hidden='true' className={STATE_ICON_CLASS.success} />
    ) : state === 'error' ? (
      errorIcon ?? <i aria-hidden='true' className={STATE_ICON_CLASS.error} />
    ) : (
      startIcon
    )

  const statusText = statusLabel ?? (typeof resolvedLabel === 'string' ? resolvedLabel : state)

  return (
    <>
      <GreenhouseButton
        {...buttonProps}
        variant={resolvedButtonVariant}
        tone={resolvedTone}
        kind={kind}
        size={size}
        dataCapture={dataCapture}
        reserveInlineSize={reserveInlineSize ?? (reserveWidth ? 136 : undefined)}
        disabled={disabled || (disableWhileLoading && isLoading)}
        leadingIcon={resolvedIcon}
        aria-busy={isLoading ? 'true' : undefined}
        aria-live='polite'
        data-state={state}
        sx={[
          theme => ({
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate',
            boxShadow: isSolid ? `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.22)}` : undefined,
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
              filter: isSolid ? `drop-shadow(0 1px 0 ${alpha(theme.palette.common.white, 0.2)})` : undefined,
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
              filter: isSolid ? `drop-shadow(0 1px 0 ${alpha(theme.palette.common.white, 0.18)})` : undefined,
              animation: reduced ? 'none' : `gh-async-spinner-spin 780ms ${MOTION_EASING} infinite`
            },
            '&::before':
              isSolid
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
              ...(isSolid
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
              ...(isSolid
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
              ...(isSolid
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
                isSolid ? `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.24)}` : undefined,
                `0 0 0 3px ${alpha(theme.palette[resolvedTone].main, 0.24)}`
              ]
                .filter(Boolean)
                .join(', ')
            },
            ...(state === 'success'
              ? {
                  boxShadow:
                    isSolid
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
                    isSolid
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
                  const statePalette = theme.palette[resolvedTone]

                  return {
                    '&.Mui-disabled': {
                      opacity: 1,
                      color: isSolid ? statePalette.contrastText : statePalette.main,
                      borderColor: isOutlined ? alpha(statePalette.main, 0.46) : undefined,
                      boxShadow:
                        isSolid
                          ? [
                              `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.2)}`,
                              `0 0 0 3px ${alpha(statePalette.main, 0.12)}`,
                              `0 8px 18px ${alpha(statePalette.main, 0.18)}`
                            ].join(', ')
                          : undefined,
                      backgroundColor:
                        isSolid
                          ? statePalette.main
                          : isOutlined
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
          ...toSxArray(sx)
        ]}
      >
        <Box component='span' sx={{ position: 'relative', zIndex: 1 }}>
          {resolvedLabel}
        </Box>
      </GreenhouseButton>
      <Box component='span' role='status' aria-live='polite' sx={visuallyHidden}>
        {statusText}
      </Box>
    </>
  )
}

export default GreenhouseAsyncActionButton
