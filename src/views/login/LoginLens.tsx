'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import { keyframes } from '@mui/material/styles'

import { MOTION_EASE, cssCubicBezier } from '@/components/greenhouse/motion/core/tokens'
import {
  ORBIT_ACCENT_END_DEG,
  ORBIT_ARC_SWEEP_DEG,
  ORBIT_TOKENS,
  arcPath,
  orbitWidthScale,
  pointOnCircle
} from '@/components/greenhouse/motion/orbit-geometry'
import type { LoginAnnouncementLens } from '@/lib/login-announcements/types'

/**
 * TASK-1964 — La Lente de «La órbita» sobre una foto, construida como la pinta AXIS (`paintGraphicLine`, elemento
 * `lens`, y su resolver en el contrato `graphic-line-orbit`):
 *
 * - Afuera, la foto apagada (gris, contraste, brillo) y multiplicada con el fondo Efeonce (`lens.outside`). Es la
 *   reserva del texto: la única excepción del sistema al «nunca velo sobre la foto».
 * - Adentro del círculo, la misma foto a todo color y **ampliada** `lens.zoom` (1,25) alrededor del centro de la lente.
 * - Alrededor, la misma órbita de siempre: el anillo **con su aire** (`orbit.ringAirRatio`, el anillo a 1,12 × el radio
 *   de la foto), el arco corto de 50° centrado arriba a la izquierda y la esfera en su punta. Trazos y esfera escalan
 *   **sólo por ancho** (`lens.anatomy` × ancho / 794).
 * - El acento (arco y esfera) es el de la línea de servicio de la novedad, sobre fondo oscuro.
 *
 * El radio es una fracción del lado corto del escenario. La foto se recorta con CSS (`cqmin`, sin JS); la órbita se
 * dibuja en píxeles del escenario una vez medido, con `pathLength` sin `vector-effect` (combinados parten el arco).
 * Ningún elemento depende de su animación para verse (`animation-fill-mode: both`).
 */

const { lens, color, motion, orbit } = ORBIT_TOKENS
const emphasized = cssCubicBezier(MOTION_EASE.emphasized.cubicBezier)

/** Ken Burns: la foto entra un 7 % más grande y se asienta durante la novedad (motion M3). */
const KEN_BURNS_FROM = 1.07

const kenBurnsOutside = keyframes`
  from { transform: scale(${KEN_BURNS_FROM}); }
  to { transform: scale(1); }
`

const kenBurnsInside = keyframes`
  from { transform: scale(${lens.zoom * KEN_BURNS_FROM}); }
  to { transform: scale(${lens.zoom}); }
`

const draw = keyframes`
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
`

const born = keyframes`
  0% { transform: scale(0); }
  55% { transform: scale(${motion.overshoot.sphereBirth}); }
  80% { transform: scale(0.92); }
  100% { transform: scale(1); }
`

export type LoginLensProps = {
  src: string
  alt: string
  lens: LoginAnnouncementLens
  /** Acento de la línea de servicio sobre oscuro (arco y esfera). */
  accent: string
  /** Ken Burns lento durante la novedad. */
  drift?: boolean
}

const LoginLens = ({ src, alt, lens: geometry, accent, drift = true }: LoginLensProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const node = rootRef.current

    if (!node) return

    const measure = () => {
      const { width, height } = node.getBoundingClientRect()

      if (width > 0 && height > 0) setSize({ width, height })
    }

    measure()

    const observer = new ResizeObserver(measure)

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const reduced = '@media (prefers-reduced-motion: reduce)'
  const origin = `${geometry.x}% ${geometry.y}%`
  const photoRadius = `calc(${geometry.radiusRatio} * 100cqmin)`

  const photoSx = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transformOrigin: origin
  } as const

  // Órbita en píxeles del escenario (misma aritmética que `paintGraphicLine`).
  const orbitSvg = (() => {
    if (!size) return null

    const scale = orbitWidthScale(size.width)
    const cx = (size.width * geometry.x) / 100
    const cy = (size.height * geometry.y) / 100
    const r = geometry.radiusRatio * Math.min(size.width, size.height) * (1 + orbit.ringAirRatio)
    const ringStroke = Math.max(1, lens.anatomy.ringStrokePx * scale)

    // Pisos de legibilidad en lienzos chicos (tarjeta móvil): la anatomía base de la órbita (`orbit.*Px`).
    const arcStroke = Math.max(orbit.arcStrokePx[0], lens.anatomy.arcStrokePx * scale)
    const sphereRadius = Math.max(orbit.sphereRadiusPx[0], lens.anatomy.sphereRadiusPx * scale)
    const sphere = pointOnCircle(cx, cy, r, ORBIT_ACCENT_END_DEG)

    return (
      <Box
        component='svg'
        aria-hidden='true'
        viewBox={`0 0 ${size.width} ${size.height}`}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          '& .lens-ring': { animation: `${draw} 700ms ${emphasized} 500ms both` },
          '& .lens-arc': { animation: `${draw} 900ms ${emphasized} 1000ms both` },
          '& .lens-sphere': {
            transformBox: 'fill-box',
            transformOrigin: 'center',
            animation: `${born} 320ms ${emphasized} 1850ms both`
          },
          [reduced]: { '& .lens-ring, & .lens-arc, & .lens-sphere': { animation: 'none' } }
        }}
      >
        <circle
          className='lens-ring'
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={color.halo}
          strokeOpacity={lens.anatomy.ringOpacity}
          strokeWidth={ringStroke}
          pathLength={1}
          strokeDasharray={1}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <path
          className='lens-arc'
          d={arcPath(cx, cy, r, ORBIT_ACCENT_END_DEG, ORBIT_ARC_SWEEP_DEG)}
          fill='none'
          stroke={accent}
          strokeWidth={arcStroke}
          strokeLinecap='round'
          pathLength={1}
          strokeDasharray={1}
        />
        <circle className='lens-sphere' cx={sphere.x} cy={sphere.y} r={sphereRadius} fill={accent} />
      </Box>
    )
  })()

  return (
    <Box ref={rootRef} sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Box
        component='img'
        src={src}
        alt=''
        aria-hidden='true'
        sx={{
          ...photoSx,
          filter: `grayscale(${lens.outside.grayscale}) contrast(${lens.outside.contrast}) brightness(${lens.outside.brightness})`,
          animation: drift ? `${kenBurnsOutside} 10s ${emphasized} both` : 'none',
          [reduced]: { animation: 'none' }
        }}
      />
      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: lens.outside.multiplyColor,
          opacity: lens.outside.multiplyOpacity,
          mixBlendMode: 'multiply'
        }}
      />
      {/* El círculo expone el `alt`; las fotos son decorativas (la ampliada desborda su caja, recortada aquí). */}
      <Box
        role='img'
        aria-label={alt}
        sx={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `circle(${photoRadius} at ${origin})` }}
      >
        <Box
          component='img'
          src={src}
          alt=''
          aria-hidden='true'
          sx={{
            ...photoSx,
            transform: `scale(${lens.zoom})`,
            animation: drift ? `${kenBurnsInside} 10s ${emphasized} both` : 'none',
            [reduced]: { animation: 'none' }
          }}
        />
      </Box>
      {orbitSvg}
    </Box>
  )
}

export default LoginLens
