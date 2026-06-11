'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import GlobalStyles from '@mui/material/GlobalStyles'
import { alpha, useTheme } from '@mui/material/styles'

import { GREENHOUSE_NEXA_BRAND_COLORS } from './greenhouse-nexa-brand-controller'

/**
 * Borde "neón vivo" de Nexa. El anillo de luz sigue **exactamente el border-radius
 * de la caja en todos los estados** porque usa `border-radius: inherit` + máscara de
 * borde (`mask-composite: exclude`) — el radio nunca se desalinea. Va montado encima
 * del borde del box (aceptado).
 *
 * Se compone de **dos anillos enmascarados** con el mismo beam y ángulo: un trazo
 * nítido (la línea) + un halo más ancho y borroso (el aura difusa) → se lee como una
 * "línea de luz", no como un punto que gira. Idle = piso teal **siempre encendido** +
 * un realce ancho y lento que barre. `:focus-within` = más brillante, más rápido y
 * bloom más amplio. Reduced-motion = glow estático. El ángulo del conic se interpola
 * con `@property --nexa-beam-angle` (giro suave). Tokenizado a los brand colors.
 */

const nexaBeamGlobalStyles = (
  <GlobalStyles
    styles={{
      '@property --nexa-beam-angle': {
        syntax: "'<angle>'",
        inherits: 'false',
        initialValue: '0deg'
      },
      '@keyframes nexa-beam-rotate': {
        to: { '--nexa-beam-angle': '360deg' }
      }
    }}
  />
)

export interface NexaGlowBorderProps {
  children: ReactNode
  /** Radio externo en px. Default 14. */
  radius?: number
  /** Grosor del anillo en px. Default 2. */
  thickness?: number
  /**
   * Si se provee, en `:focus-within` se pinta un anillo de ese color **inset en la
   * MISMA caja** (mismo radio que el glow) — para combinar el acento de foco (ej.
   * azul primary) con el glow teal sin un box interno de radio distinto.
   */
  focusRingColor?: string
}

const NexaGlowBorder = ({ children, radius = 14, thickness = 2, focusRingColor }: NexaGlowBorderProps) => {
  const theme = useTheme()
  const teal = GREENHOUSE_NEXA_BRAND_COLORS.electricTeal
  const core = alpha(theme.palette.common.white, 0.9)

  // Línea de luz: piso teal **siempre encendido** en toda la vuelta (la línea nunca
  // se apaga) + un realce ancho y muy suave que barre lentamente. El highlight es un
  // teal-blanco difuso (sin punto blanco duro) → se lee como un trazo luminoso vivo,
  // no como un tren ni un punto que gira.
  const beam = `conic-gradient(from var(--nexa-beam-angle),
    ${alpha(teal, 0.45)} 0deg,
    ${alpha(teal, 0.45)} 130deg,
    ${alpha(teal, 0.66)} 215deg,
    ${alpha(teal, 0.92)} 285deg,
    ${alpha(core, 0.85)} 322deg,
    ${alpha(teal, 0.92)} 358deg,
    ${alpha(teal, 0.45)} 360deg)`

  return (
    <>
      {nexaBeamGlobalStyles}
      <Box
        sx={{
          position: 'relative',
          borderRadius: `${radius}px`,
          // Bloom en dos capas: núcleo nítido (la línea) + halo amplio difuso (el aura).
          boxShadow: `0 0 7px ${alpha(teal, 0.34)}, 0 0 22px ${alpha(teal, 0.26)}`,
          transition: 'box-shadow 0.4s ease',
          '&:focus-within': { boxShadow: `0 0 9px ${alpha(teal, 0.5)}, 0 0 40px ${alpha(teal, 0.46)}` },
          '&:focus-within .nexa-glow-ring': { opacity: 1, animationDuration: '3.4s' },
          '&:focus-within .nexa-glow-ring-soft': { opacity: 0.7, animationDuration: '3.4s' },
          // El acento de foco (azul) se pinta en ESTA misma caja (mismo radio que el
          // glow), no en un box interno → no hay anidado de radios distintos.
          ...(focusRingColor
            ? { '&:focus-within .nexa-glow-content': { boxShadow: `inset 0 0 0 2px ${focusRingColor}` } }
            : {})
        }}
      >
        <Box
          className='nexa-glow-content'
          sx={{
            position: 'relative',
            zIndex: 1,
            borderRadius: `${radius}px`,
            bgcolor: 'background.paper',
            transition: 'box-shadow 0.2s ease'
          }}
        >
          {children}
        </Box>
        {/* Halo difuso: trazo más ancho y muy borroso → el aura suave de la línea. */}
        <Box
          aria-hidden
          className='nexa-glow-ring-soft'
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            borderRadius: 'inherit',
            padding: `${thickness + 1.5}px`,
            background: beam,
            WebkitMask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            filter: 'blur(5px)',
            opacity: 0.55,
            pointerEvents: 'none',
            animation: 'nexa-beam-rotate 7s linear infinite',
            transition: 'opacity 0.4s ease',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', background: alpha(teal, 0.4) }
          }}
        />
        {/* Trazo nítido: la línea de luz en sí. */}
        <Box
          aria-hidden
          className='nexa-glow-ring'
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            borderRadius: 'inherit', // ← mismo radio que la caja, en todos los estados
            padding: `${thickness}px`,
            background: beam,
            WebkitMask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            filter: 'blur(1.6px)',
            opacity: 0.92,
            pointerEvents: 'none',
            animation: 'nexa-beam-rotate 7s linear infinite',
            transition: 'opacity 0.35s ease',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', background: alpha(teal, 0.5) }
          }}
        />
      </Box>
    </>
  )
}

export default NexaGlowBorder
