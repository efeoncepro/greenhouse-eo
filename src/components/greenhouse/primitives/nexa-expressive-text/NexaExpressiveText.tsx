'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import { axisChartDirectional, axisChartDirectionalDark } from '@core/theme/axis-chart'

import type {
  NexaExpressiveTextProps,
  NexaExpressiveTextSegment,
  NexaExpressiveTextStyle,
  NexaExpressiveTextValue
} from './nexa-expressive-text-types'

// Marcador semántico: el énfasis de riesgo/positivo se trata como un "highlighter" —
// fondo tenue del color de chart canónico (axis-chart "Deep-bright", vibrante + mode-aware)
// con texto ink AA encima (theme.greenhouseSemantic.<role>.tonalText). NUNCA el color de chart
// como color de texto directo: esos tonos están tuneados para trazos de chart y fallan 4.5:1
// como texto. box-decoration-break: clone para que el resaltado envuelva limpio en multi-línea.
const markerStyle = (theme: Theme, chartColor: string, role: 'success' | 'warning' | 'error') => ({
  color: theme.greenhouseSemantic[role].tonalText,
  backgroundColor: alpha(chartColor, theme.palette.mode === 'dark' ? 0.24 : 0.16),
  fontWeight: 600,
  borderRadius: `${theme.shape.customBorderRadius.xs}px`,
  paddingInline: '0.28em',
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone'
})

const expressiveTextSx = (theme: Theme, style: NexaExpressiveTextStyle = 'plain') => {
  const directional = theme.palette.mode === 'dark' ? axisChartDirectionalDark : axisChartDirectional

  const map = {
    plain: {},
    strong: {
      color: theme.palette.text.primary,
      fontWeight: 600
    },
    emphasis: {
      color: theme.palette.text.primary,
      fontStyle: 'italic'
    },
    soft: {
      color: theme.palette.text.secondary
    },
    metric: {
      color: theme.palette.text.primary,
      fontWeight: 700,
      fontFeatureSettings: '"tnum" 1',
      backgroundColor: alpha(theme.palette.primary.main, 0.055),
      borderRadius: `${theme.shape.customBorderRadius.xs}px`,
      paddingInline: '0.3em',
      boxDecorationBreak: 'clone',
      WebkitBoxDecorationBreak: 'clone'
    },
    positive: markerStyle(theme, directional.positive, 'success'),
    warning: markerStyle(theme, directional.caution, 'warning'),
    danger: markerStyle(theme, directional.negative, 'error')
  } satisfies Record<NexaExpressiveTextStyle, object>

  return map[style]
}

const renderSegment = (segment: NexaExpressiveTextSegment, index: number) => {
  if (segment.type === 'break') {
    return <br key={`break-${index}`} />
  }

  if (segment.type === 'emoji') {
    return (
      <Box
        key={`emoji-${index}-${segment.value}`}
        component='span'
        role={segment.label ? 'img' : undefined}
        aria-label={segment.label}
        aria-hidden={segment.label ? undefined : true}
        sx={{
          display: 'inline-block',
          mx: 0.35,
          lineHeight: 1,
          transform: 'translateY(0.08em)',
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none'
          }
        }}
      >
        {segment.value}
      </Box>
    )
  }

  return (
    <Box key={`text-${index}-${segment.text}`} component='span' sx={theme => expressiveTextSx(theme, segment.style)}>
      {segment.text}
    </Box>
  )
}

export const hasExpressiveTextSegments = (value: NexaExpressiveTextValue): value is NexaExpressiveTextSegment[] =>
  Array.isArray(value)

export const getNexaExpressiveTextPlainText = (value: NexaExpressiveTextValue) => {
  if (!hasExpressiveTextSegments(value)) return value

  return value
    .map(segment => {
      if (segment.type === 'break') return '\n'
      if (segment.type === 'emoji') return segment.label ?? segment.value

      return segment.text
    })
    .join('')
}

const NexaExpressiveText = ({ value, variant = 'body2', color, component, sx }: NexaExpressiveTextProps) => {
  const content = hasExpressiveTextSegments(value) ? value.map(renderSegment) : value
  const typographyProps = component ? { component } : {}

  return (
    <Typography variant={variant} color={color} sx={sx} {...typographyProps}>
      {content}
    </Typography>
  )
}

export default NexaExpressiveText
