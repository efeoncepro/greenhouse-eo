'use client'

import Box from '@mui/material/Box'
import { keyframes } from '@mui/material/styles'

import { MOTION_EASE, cssCubicBezier } from './core/tokens'
import { ORBIT_ARC_SWEEP_DEG, ORBIT_TOKENS, ORBIT_TOP_DEG, arcPath, pointOnCircle } from './orbit-geometry'

/**
 * TASK-1964 — `OrbitLoader`: el indicador de espera de «La órbita».
 *
 * La esfera RECORRE el anillo con una estela corta (nunca lo llena como una barra: regla de la línea gráfica). Gira
 * con el ritmo de la marca (lento → rápido → lento). Con `prefers-reduced-motion` la esfera queda quieta a las 12 y el
 * estado lo comunica el texto que acompaña al loader.
 *
 * - `size="sm"` (20 px): dentro de botones; `size="lg"` (140 px): pantallas de carga.
 * - `tone="light"`: sobre papel (anillo navy, acento oscuro). `tone="onAccent"`: sobre un botón navy (blanco).
 *
 * Es decorativo (`aria-hidden`); quien lo usa pone el texto de estado con `role="status"`.
 */

export type OrbitLoaderProps = {
  size?: 'sm' | 'lg'
  tone?: 'light' | 'onAccent'
}

const SIZES = { sm: 20, lg: 140 } as const

/** Una vuelta en 1,6 s con curva `standard` (lento → rápido → lento, principio de `efeonceGraphicLine.motion`). */
const LOOP_MS = 1600

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const OrbitLoader = ({ size = 'lg', tone = 'light' }: OrbitLoaderProps) => {
  const box = SIZES[size]
  const c = box / 2
  const r = c - (size === 'sm' ? 2 : 14)
  const { color, orbit, lens, trajectory } = ORBIT_TOKENS
  // Sobre un botón el loader hereda el color del texto del botón (`currentColor`).
  const ring = tone === 'onAccent' ? 'currentColor' : color.navy
  const accent = tone === 'onAccent' ? 'currentColor' : color.tealDark
  const sphere = pointOnCircle(c, c, r, ORBIT_TOP_DEG)
  const sphereR = size === 'sm' ? 2.2 : Math.max(orbit.sphereRadiusPx[1], lens.anatomy.sphereRadiusPx)

  return (
    <Box
      component='svg'
      aria-hidden='true'
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      sx={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill='none'
        stroke={ring}
        strokeOpacity={tone === 'onAccent' ? 0.3 : orbit.ringOpacity[0]}
        strokeWidth={size === 'sm' ? 1.5 : lens.anatomy.ringStrokePx}
      />
      <Box
        component='g'
        sx={{
          transformOrigin: `${c}px ${c}px`,
          animation: `${spin} ${LOOP_MS}ms ${cssCubicBezier(MOTION_EASE.standard.cubicBezier)} infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        }}
      >
        <path
          d={arcPath(c, c, r, ORBIT_TOP_DEG, Math.min(ORBIT_ARC_SWEEP_DEG, trajectory.measure.trailDeg))}
          fill='none'
          stroke={accent}
          strokeOpacity={trajectory.measure.travelledPath.opacity}
          strokeWidth={size === 'sm' ? 1.5 : orbit.arcStrokePx[1]}
          strokeLinecap='round'
        />
        <circle cx={sphere.x} cy={sphere.y} r={sphereR} fill={accent} />
      </Box>
    </Box>
  )
}

/** Curva de entrada de las pantallas que acompañan al loader (re-export para consumidores del login). */
export const ORBIT_ENTER_EASE = cssCubicBezier(MOTION_EASE.emphasized.cubicBezier)

export default OrbitLoader
