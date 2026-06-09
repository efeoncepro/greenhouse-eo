'use client'

import type { ReactNode } from 'react'

import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'
import type { SxProps, Theme } from '@mui/material/styles'

import {
  GREENHOUSE_BUTTON_SIZE_TOKENS,
  GREENHOUSE_BUTTON_VARIANT_CONFIG,
  resolveGreenhouseButtonTone,
  resolveGreenhouseButtonVariant,
  type GreenhouseButtonKind,
  type GreenhouseButtonSize,
  type GreenhouseButtonTone,
  type GreenhouseButtonVariant
} from './greenhouse-button-controller'

export interface GreenhouseButtonProps
  extends Omit<ButtonProps, 'children' | 'color' | 'endIcon' | 'size' | 'startIcon' | 'variant'> {
  children: ReactNode
  variant?: GreenhouseButtonVariant
  tone?: GreenhouseButtonTone
  size?: GreenhouseButtonSize
  kind?: GreenhouseButtonKind
  leadingIcon?: ReactNode
  leadingIconClassName?: string
  trailingIcon?: ReactNode
  trailingIconClassName?: string
  dataCapture?: string
  reserveInlineSize?: number
}

const iconNode = (icon?: ReactNode, className?: string) => icon ?? (className ? <i aria-hidden='true' className={className} /> : undefined)

const getButtonSx = ({
  reserveInlineSize,
  size
}: {
  reserveInlineSize?: number
  size: GreenhouseButtonSize
}): SxProps<Theme> => {
  const sizeToken = GREENHOUSE_BUTTON_SIZE_TOKENS[size]

  return theme => ({
    minBlockSize: sizeToken.minBlockSize,
    minInlineSize: reserveInlineSize,
    whiteSpace: 'nowrap',

    '& .MuiButton-startIcon > i, & .MuiButton-endIcon > i': {
      fontSize: sizeToken.iconSize
    },

    '&.Mui-focusVisible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2
    },

    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',

      '&:not(.Mui-disabled):active': {
        transform: 'none'
      }
    }
  })
}

const GreenhouseButton = ({
  children,
  dataCapture,
  kind = 'custom',
  leadingIcon,
  leadingIconClassName,
  reserveInlineSize,
  size = 'medium',
  sx,
  tone,
  trailingIcon,
  trailingIconClassName,
  variant,
  ...props
}: GreenhouseButtonProps) => {
  const resolvedVariant = resolveGreenhouseButtonVariant({ kind, variant })
  const resolvedTone = resolveGreenhouseButtonTone({ kind, tone })
  const muiVariant = GREENHOUSE_BUTTON_VARIANT_CONFIG[resolvedVariant].muiVariant

  return (
    <Button
      {...props}
      color={resolvedTone}
      data-capture={dataCapture}
      data-kind={kind}
      data-tone={resolvedTone}
      data-variant={resolvedVariant}
      endIcon={iconNode(trailingIcon, trailingIconClassName)}
      size={size}
      startIcon={iconNode(leadingIcon, leadingIconClassName)}
      variant={muiVariant}
      sx={[getButtonSx({ reserveInlineSize, size }), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children}
    </Button>
  )
}

export default GreenhouseButton
