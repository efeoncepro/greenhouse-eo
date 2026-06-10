'use client'

/**
 * ClaudeEfeonceFilledOrbitMark — experimento de Claude (NO es de Codex).
 *
 * Variante de la firma orbital donde el círculo recorre la órbita completa (3D
 * con profundidad) SIN dejar el "hueco" del anillo: la abertura superior
 * canónica de la "O" se rellena con un puente del mismo grosor/taper cosido a
 * los dos arcos, de modo que el anillo se lee continuo mientras el círculo
 * orbita por encima.
 *
 * Es una hoja de experimentación interna del design system. Vive aparte de la
 * primitive de Codex (`EfeonceOrbitalLogoMark`) y usa ids `#claude-*` para no
 * colisionar si ambas se renderizan en la misma página.
 */

import { useRef } from 'react'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { useGreenhouseGSAP } from '@/components/greenhouse/motion'

import { EFEONCE_ORBITAL_LOGO_COLOR } from './efeonce-orbital-logo-controller'

export interface ClaudeEfeonceFilledOrbitMarkProps {
  /** Segundos por vuelta. Default 4. */
  orbitDuration?: number
  decorative?: boolean
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

// Geometría de la órbita — centerline REAL del anillo de la "O", ajustado por
// mínimos cuadrados sobre el path canónico (no el bounding box). El anillo es
// grueso a los lados y fino arriba/abajo, así que su centro vertical (~95.7) y
// su semieje vertical (~50) NO coinciden con el bbox; con estos valores el
// círculo monta sobre la línea del óvalo en toda la vuelta.
const CX = 404.55
const CY = 95.7
const RX = 112
const RY = 50

// Puente que cierra la abertura superior de los arcos canónicos, siguiendo la
// curva de la elipse y con un leve overlap para que la costura sea invisible.
const ORBIT_BRIDGE_D = 'M377.8,42.5 Q404.57,40.6 431.3,42.5 L430.6,49.2 Q404.57,47.4 378.5,49.2 Z'

const ClaudeEfeonceFilledOrbitMark = ({
  orbitDuration = 4,
  decorative = false,
  ariaLabel = 'Efeonce — firma orbital (círculo recorriendo la órbita)',
  dataCapture,
  sx
}: ClaudeEfeonceFilledOrbitMarkProps) => {
  const scopeRef = useRef<HTMLSpanElement | null>(null)

  useGreenhouseGSAP(
    ctx => {
      const scope = scopeRef.current
      const circle = scope?.querySelector<SVGCircleElement>('#claude-orbiting-circle')
      const orbitGroup = circle?.parentElement
      const ship = scope?.querySelector<SVGGElement>('#claude-ship')

      if (!circle || !orbitGroup || !ship) return

      ctx.gsap.set(circle, { transformBox: 'fill-box', transformOrigin: 'center' })

      // Reduced motion / estado estático: círculo en reposo en el ápex superior.
      if (ctx.reduced) {
        ctx.gsap.set(circle, { attr: { cx: CX, cy: CY - RY }, scale: 1, opacity: 1, clearProps: 'transform' })

        return
      }

      const state = { t: -Math.PI / 2 } // arranca en el ápex (reposo del logo)
      let inFront = true

      ctx.gsap.to(state, {
        t: -Math.PI / 2 + Math.PI * 2,
        duration: orbitDuration,
        ease: 'none',
        repeat: -1,
        onUpdate() {
          const t = state.t
          const x = CX + RX * Math.cos(t)
          const y = CY + RY * Math.sin(t)
          const depth = (Math.sin(t) + 1) / 2 // 0 arriba (atrás) … 1 abajo (frente)

          ctx.gsap.set(circle, {
            attr: { cx: x, cy: y },
            scale: 0.62 + 0.5 * depth,
            opacity: 0.55 + 0.45 * depth
          })

          // z-order: mitad superior (sin<0) → detrás de la nave.
          const wantFront = Math.sin(t) >= 0

          if (wantFront && !inFront) {
            orbitGroup.appendChild(circle)
            inFront = true
          } else if (!wantFront && inFront) {
            orbitGroup.insertBefore(circle, ship)
            inFront = false
          }
        }
      })
    },
    { scope: scopeRef, dependencies: [orbitDuration] }
  )

  return (
    <Box
      component='span'
      ref={scopeRef}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? 'true' : undefined}
      data-capture={dataCapture}
      data-kind='claude-efeonce-filled-orbit-mark'
      sx={[
        {
          display: 'inline-flex',
          inlineSize: 'min(100%, 520px)',
          color: EFEONCE_ORBITAL_LOGO_COLOR,
          '& svg': { display: 'block', inlineSize: '100%', blockSize: 'auto', overflow: 'visible' },
          '& #claude-orbiting-circle': { willChange: 'transform, opacity' }
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <svg viewBox='0 0 837.07 196.68' aria-hidden='true' focusable='false'>
        <g fill='currentColor'>
          <path d='M56.83,48.7c20.87-.2,44.73,5.17,44.13,30.42-.99,51.88-54.47,41.94-61.82,38.96-1.39,9.14,2.58,10.54,16.7,10.54,9.14,0,28.23-1.79,37.97-3.78l-4.77,27.04c-15.31,4.97-32.8,8.15-59.44,5.77-25.25-2.19-34.39-26.04-27.23-64.61,6.16-32.4,15.7-43.93,54.47-44.33ZM61.2,86.08c1.19-6.36-1.59-8.95-7.36-8.75-8.35.4-10.34,7.16-11.73,16.1,0,0,16.7,5.37,19.08-7.35Z' />
          <path d='M106.72,54.07l14.71-3.38,3.18-19.68C128.39,6.96,142.3,0,166.16,0c9.74,0,17.69.79,24.85,4.77l-3.58,22.07c-.2,0-14.51-.2-14.51-.2-9.94-.2-9.74,3.98-11.73,16.3l-1.19,7.75h19.48l-4.17,26.64h-19.48l-12.52,78.92h-38.57l12.52-78.92h-14.31l3.78-23.26Z' />
          <path d='M235.73,48.7c20.87-.2,44.73,5.17,44.13,30.42-.99,51.88-54.47,41.94-61.82,38.96-1.39,9.14,2.58,10.54,16.7,10.54,9.14,0,28.23-1.79,37.97-3.78l-4.77,27.04c-15.31,4.97-32.8,8.15-59.44,5.77-25.25-2.19-34.39-26.04-27.23-64.61,6.16-32.4,15.7-43.93,54.47-44.33ZM240.11,86.08c1.19-6.36-1.59-8.95-7.36-8.75-8.35.4-10.34,7.16-11.73,16.1,0,0,16.7,5.37,19.08-7.35Z' />
          <path d='M544.25,50.69h32.2l4.77,10.34c7.55-6.16,14.91-12.13,31.01-12.13,27.43,0,27.83,17.49,24.25,39.76l-10.73,67.59h-38.57l10.73-68.38c1.39-8.35-.4-10.34-4.77-10.34-7.36,0-12.52,1.99-15.71,7.36l-11.33,71.37h-38.57l16.7-105.56Z' />
          <path d='M688.17,48.7c10.34,0,34.79.99,50.29,7.16l-3.58,22.66s-11.73-1.19-29.42-1.19c-13.52,0-17.89.6-22.07,26.44-3.78,24.25-.4,24.85,13.92,24.85,18.29,0,31.41-1.59,31.41-1.59l-3.58,22.66c-14.51,6.56-27.63,7.95-53.87,7.55-19.68-.2-32.8-18.49-26.24-59.84,6.56-41.35,22.86-48.7,43.14-48.7Z' />
          <path d='M792.93,48.7c20.87-.2,44.73,5.17,44.13,30.42-.99,51.88-54.47,41.94-61.82,38.96-1.39,9.14,2.58,10.54,16.7,10.54,9.14,0,28.23-1.79,37.97-3.78l-4.77,27.04c-15.31,4.97-32.8,8.15-59.44,5.77-25.25-2.19-34.39-26.04-27.23-64.61,6.16-32.4,15.7-43.93,54.47-44.33ZM797.3,86.08c1.19-6.36-1.59-8.95-7.35-8.75-8.35.4-10.34,7.16-11.73,16.1,0,0,16.7,5.37,19.08-7.35Z' />
        </g>
        <g id='claude-orbit-mark' fill='currentColor'>
          <g id='claude-orbit-rings'>
            <path d='M295.76,101.14c0-25.43,35.88-46.73,84.03-52.26-.5-1.99-.76-4.07-.76-6.21,0-.15,0-.29.01-.44-55.19,5.79-96.6,29.96-96.6,58.91,0,19.69,19.16,37.17,48.78,48.16,1.54-2.09,2.69-4.49,3.37-7.08-23.73-9.84-38.82-24.59-38.82-41.08Z' />
            <path d='M430.09,42.23c0,.15.01.29.01.44,0,2.14-.27,4.22-.76,6.21,48.16,5.53,84.03,26.83,84.03,52.26,0,6.73-2.52,13.16-7.1,19.09,3.21,2.61,5.55,5.39,7.02,8.36,8.56-8.23,13.41-17.56,13.41-27.45,0-28.95-41.41-53.12-96.6-58.91Z' />
            <path id='claude-orbit-bridge' d={ORBIT_BRIDGE_D} />
          </g>
          <g id='claude-ship'>
            <path d='M457.51,165.97l.6-.11h0s1.03-.21,1.03-.21c42.7-8.45,51.67-20.54,51.67-29.2v-.14c-.02-1.6-.33-3.12-.9-4.58-21.25,17.75-60.42,29.66-105.24,29.66-.78,0-1.55-.01-2.32-.02-24.73-.23-47.67-4.07-66.71-10.52-3.91,5.93-10.23,10.13-17.57,11.2-1.46.21-2.4,1.68-2,3.1,3.47,12.48,9.17,23.13,16.32,30.76.53.56,1.29.84,2.06.75,9.22-1.03,18.03-3.26,25.93-6.61,10.27-4.36,18.57-10.39,24.15-17.54,4.92-.04,9.78-.16,14.59-.35,10.52-.4,20.77-1.11,30.63-2.16,1.05-.11,2.1-.23,3.14-.35,6.35-.73,12.49-1.59,18.32-2.57l6.31-1.12Z' />
            <path d='M451.21,105.81c-5.83-.98-11.97-1.85-18.32-2.57-1.04-.12-2.08-.23-3.14-.35-9.95-1.06-20.31-1.78-30.94-2.17-4.93-.18-9.91-.3-14.94-.34-5.69-6.93-13.97-12.77-24.11-16.97-7.74-3.21-16.34-5.35-25.32-6.35-.76-.09-1.53.19-2.06.75-7.15,7.63-12.85,18.28-16.32,30.76-.4,1.43.56,2.89,2.02,3.1,12.3,1.8,21.74,12.39,21.74,25.19,0,2.44-.35,4.8-.99,7.03,18.03,6.77,40.47,10.82,64.83,10.93.34,0,.67,0,1.01,0,43.83,0,81.6-12.78,98.84-31.2-9.89-8-28.19-13.17-44.36-16.37l-1.03-.2h0s-.6-.12-.6-.12l-6.31-1.12ZM397.41,138.17c-4.79.6-8.82-3.43-8.22-8.22.41-3.27,3.05-5.9,6.32-6.32,4.79-.6,8.82,3.43,8.22,8.22-.41,3.27-3.05,5.9-6.32,6.31ZM420.16,138.17c-4.79.6-8.83-3.43-8.22-8.22.41-3.27,3.05-5.9,6.32-6.31,4.79-.6,8.82,3.43,8.22,8.22-.41,3.27-3.05,5.9-6.31,6.32ZM442.91,138.17c-4.79.6-8.83-3.43-8.22-8.22.41-3.27,3.05-5.9,6.32-6.31,4.79-.6,8.82,3.43,8.22,8.22-.41,3.27-3.05,5.9-6.31,6.32Z' />
          </g>
          <circle id='claude-orbiting-circle' cx='404.57' cy='44.13' r='20.76' />
        </g>
      </svg>
    </Box>
  )
}

export default ClaudeEfeonceFilledOrbitMark
