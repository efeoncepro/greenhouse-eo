'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

/**
 * NexaPresenceMark — primitive canónica del indicador de presencia de Nexa en el header del
 * chat: crossfade "En línea" ↔ "Pensando…" con elipsis ANIMADA (mismo lenguaje de motion que
 * el thinking beat → se percibe "cargando el pensamiento"). Vuelve a "En línea" al terminar
 * (lo gobierna la prop `thinking`).
 *
 * - **Grid stacking**: ambos labels ocupan la misma celda → el ancho lo define el texto mayor
 *   (sin saltos al alternar).
 * - **a11y**: el label inactivo va `aria-hidden`; los puntos son decorativos (`aria-hidden`).
 * - **reduced-motion** horneado: la elipsis queda estática.
 * - Color por defecto: blanco translúcido (header navy). Override con `color`.
 *
 * Labels vía props (default genéricos) — la consumer pasa el copy es-CL canónico
 * (`GH_NEXA.floating.presence_online` / `presence_thinking`).
 */
export interface NexaPresenceMarkProps {
  /** `true` mientras Nexa genera la respuesta → muestra "Pensando…". */
  thinking: boolean
  onlineLabel?: string
  thinkingLabel?: string
  /** Color base del texto (default blanco translúcido para header navy). */
  color?: string
}

const NexaPresenceMark = ({
  thinking,
  onlineLabel = 'En línea',
  thinkingLabel = 'Pensando',
  color
}: NexaPresenceMarkProps) => {
  const theme = useTheme()
  const base = color ?? theme.palette.common.white

  return (
    <Box sx={{ display: 'grid', alignItems: 'center' }}>
      <Typography
        variant='caption'
        sx={{
          gridArea: '1 / 1',
          whiteSpace: 'nowrap',
          color: alpha(base, 0.72),
          opacity: thinking ? 0 : 1,
          transition: 'opacity 200ms ease'
        }}
      >
        {onlineLabel}
      </Typography>
      <Box
        component='span'
        aria-hidden={!thinking}
        sx={{
          gridArea: '1 / 1',
          display: 'inline-flex',
          alignItems: 'baseline',
          whiteSpace: 'nowrap',
          typography: 'caption',
          color: alpha(base, 0.82),
          opacity: thinking ? 1 : 0,
          transition: 'opacity 200ms ease'
        }}
      >
        {thinkingLabel}
        {[0, 1, 2].map(i => (
          <Box
            key={i}
            component='span'
            aria-hidden
            sx={{
              '@keyframes nexa-presence-dot': { '0%, 70%, 100%': { opacity: 0.2 }, '35%': { opacity: 1 } },
              animation: `nexa-presence-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 }
            }}
          >
            .
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default NexaPresenceMark
