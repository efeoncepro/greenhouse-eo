'use client'

import type { MouseEventHandler, ReactNode } from 'react'

import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

export type GreenhouseShinyBorderPalette = 'axis' | 'nexa'

export type GreenhouseShinyBorderIntensity = 'subtle' | 'medium' | 'strong'

export interface GreenhouseShinyBorderProps {
  children: ReactNode
  asButton?: boolean
  ariaLabel?: string
  dataCapture?: string
  disabled?: boolean
  intensity?: GreenhouseShinyBorderIntensity
  onClick?: MouseEventHandler<HTMLButtonElement>
  palette?: GreenhouseShinyBorderPalette
  sx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
  type?: 'button' | 'submit' | 'reset'
}

const INTENSITY_SCALE: Record<GreenhouseShinyBorderIntensity, number> = {
  subtle: 0.72,
  medium: 1,
  strong: 1.2
}

/**
 * Tokenized version of the "shiny borders button" prompt: radial top shine,
 * bottom-left accent glow and inner raised content without owning a product action.
 */
const GreenhouseShinyBorder = ({
  ariaLabel,
  asButton = false,
  children,
  contentSx,
  dataCapture,
  disabled = false,
  intensity = 'medium',
  onClick,
  palette = 'axis',
  sx,
  type = 'button'
}: GreenhouseShinyBorderProps) => {
  const actionProps = asButton
    ? {
        component: 'button' as const,
        disabled,
        onClick,
        type
      }
    : {
        component: 'div' as const
      }

  const scale = INTENSITY_SCALE[intensity]

  return (
    <Box
      {...actionProps}
      aria-label={ariaLabel}
      data-capture={dataCapture}
      data-palette={palette}
      data-shiny-border
      sx={[
        theme => {
          const shine = theme.palette.common.white
          const base = theme.axis.ramp.primary[900]
          const accent = palette === 'nexa' ? theme.axis.ramp.info[500] : theme.axis.ramp.secondary[500]
          const accentSoft = palette === 'nexa' ? theme.axis.ramp.secondary[500] : theme.axis.ramp.info[500]
          const outerRadius = `${theme.shape.customBorderRadius.display}px`

          return {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minInlineSize: 'max-content',
            maxInlineSize: '100%',
            p: '2px',
            border: 0,
            borderRadius: outerRadius,
            color: theme.palette.common.white,
            cursor: asButton && !disabled ? 'pointer' : 'default',
            font: 'inherit',
            isolation: 'isolate',
            outline: 0,
            overflow: 'visible',
            textDecoration: 'none',
            background: `radial-gradient(circle ${theme.spacing(20)} at 80% -10%, ${alpha(shine, 0.96)}, ${base} 72%)`,
            opacity: disabled ? 0.58 : 1,
            transition: 'filter 220ms ease, opacity 220ms ease',
            '&:focus-visible': {
              boxShadow: `0 0 0 3px ${alpha(accentSoft, 0.36)}`
            },
            '&:hover [data-gh-shiny-back-glow]': {
              boxShadow: `0 0 ${theme.spacing(10)} ${alpha(shine, 0.38 * scale)}`
            },
            '&:hover [data-gh-shiny-corner-glow]': {
              inlineSize: theme.spacing(22),
              boxShadow: `-${theme.spacing(1)} ${theme.spacing(0.25)} ${theme.spacing(11)} ${alpha(accent, 0.38 * scale)}`
            },
            '&:hover [data-gh-shiny-content]': {
              transform: disabled ? 'none' : 'scale(1.06)'
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '& [data-gh-shiny-content]': {
                transition: 'none'
              },
              '&:hover [data-gh-shiny-content]': {
                transform: 'none'
              }
            },
            '@media (forced-colors: active)': {
              border: '1px solid CanvasText',
              background: 'ButtonFace',
              color: 'ButtonText'
            }
          }
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        aria-hidden
        data-gh-shiny-back-glow
        sx={theme => ({
          position: 'absolute',
          insetBlockStart: 0,
          insetInlineEnd: 0,
          zIndex: -1,
          inlineSize: '65%',
          blockSize: '60%',
          borderRadius: `${theme.shape.customBorderRadius.display * 7.5}px`,
          boxShadow: `0 0 ${theme.spacing(5)} ${alpha(theme.palette.common.white, 0.22 * scale)}`,
          transition: 'box-shadow 240ms ease'
        })}
      />
      <Box
        aria-hidden
        data-gh-shiny-corner-glow
        sx={theme => {
          const accent = palette === 'nexa' ? theme.axis.ramp.info[500] : theme.axis.ramp.secondary[500]
          const accentSoft = palette === 'nexa' ? theme.axis.ramp.secondary[500] : theme.axis.ramp.info[500]

          return {
            position: 'absolute',
            insetBlockEnd: 0,
            insetInlineStart: 0,
            inlineSize: theme.spacing(12),
            blockSize: '50%',
            borderRadius: `${theme.shape.customBorderRadius.display}px`,
            background: `radial-gradient(circle ${theme.spacing(15)} at 0% 100%, ${alpha(accent, 0.94)}, ${alpha(accentSoft, 0.34)}, transparent)`,
            boxShadow: `-${theme.spacing(0.5)} ${theme.spacing(2.25)} ${theme.spacing(10)} ${alpha(accent, 0.26 * scale)}`,
            transition: 'inline-size 240ms ease, box-shadow 240ms ease'
          }
        }}
      />
      <Box
        data-gh-shiny-content
        sx={[
          theme => {
            const accent = palette === 'nexa' ? theme.axis.ramp.info[500] : theme.axis.ramp.secondary[500]

            return {
              position: 'relative',
              zIndex: 1,
              px: 6,
              py: 3,
              borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
              color: theme.palette.common.white,
              bgcolor: theme.axis.ramp.primary[900],
              background: `radial-gradient(circle ${theme.spacing(20)} at 80% -50%, ${alpha(theme.palette.common.white, 0.42)}, ${theme.axis.ramp.primary[900]} 68%)`,
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.18)}`,
              fontWeight: 700,
              lineHeight: 1.25,
              transformOrigin: 'center',
              transition: 'transform 240ms ease',
              whiteSpace: 'nowrap',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                zIndex: -1,
                borderRadius: 'inherit',
                background: `radial-gradient(circle ${theme.spacing(15)} at 0% 100%, ${alpha(accent, 0.16)}, ${alpha(theme.axis.ramp.info[500], 0.08)}, transparent)`
              }
            }
          },
          ...(Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : [])
        ]}
      >
        {children}
      </Box>
    </Box>
  )
}

export default GreenhouseShinyBorder
