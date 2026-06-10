'use client'

import { useRef } from 'react'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { MOTION_DURATION_S, useGreenhouseGSAP } from '@/components/greenhouse/motion'

import {
  EFEONCE_ORBITAL_LOGO_COLOR,
  resolveEfeonceOrbitalLogoAriaLabel,
  resolveEfeonceOrbitalLogoVariant,
  type EfeonceOrbitalLogoKind,
  type EfeonceOrbitalLogoVariant
} from './efeonce-orbital-logo-controller'

export interface EfeonceOrbitalLogoMarkProps {
  variant?: EfeonceOrbitalLogoVariant
  kind?: EfeonceOrbitalLogoKind
  decorative?: boolean
  ariaLabel?: string
  dataCapture?: string
  replayOnHover?: boolean
  sx?: SxProps<Theme>
}

const ORBIT_CENTER = '404.57 101.14'

const ORBIT_GEOMETRY = {
  cx: 404.57,
  cy: 101.14,
  rx: 118,
  ry: 57.01
} as const

const EfeonceOrbitalLogoMark = ({
  variant,
  kind = 'institutionalWordmark',
  decorative = false,
  ariaLabel,
  dataCapture,
  replayOnHover = false,
  sx
}: EfeonceOrbitalLogoMarkProps) => {
  const scopeRef = useRef<HTMLSpanElement | null>(null)
  const replayRef = useRef<() => void>(() => undefined)
  const resolvedVariant = resolveEfeonceOrbitalLogoVariant({ kind, variant })
  const resolvedAriaLabel = resolveEfeonceOrbitalLogoAriaLabel({ kind, ariaLabel })

  useGreenhouseGSAP(
    ctx => {
      const scope = scopeRef.current
      const wordmark = scope?.querySelector('#efeonce-wordmark-letters')
      const orbit = scope?.querySelector('#efeonce-orbit-mark')
      const rings = scope?.querySelector('#efeonce-orbit-rings')
      const topBridge = scope?.querySelector('#efeonce-orbit-top-bridge')
      const satelliteCircle = scope?.querySelector('#efeonce-orbiting-satellite-circle')
      const ship = scope?.querySelectorAll('#efeonce-ship-upper-body, #efeonce-ship-lower-body')

      if (!wordmark || !orbit || !rings || !topBridge || !satelliteCircle || !ship?.length) return

      const orbitState = { angle: -90 }

      const renderSatellite = () => {
        const rad = (orbitState.angle * Math.PI) / 180
        const depth = (Math.sin(rad) + 1) / 2
        const scale = 1 - depth * 0.16
        const opacity = 1 - depth * 0.34

        satelliteCircle.setAttribute('cx', String(ORBIT_GEOMETRY.cx + ORBIT_GEOMETRY.rx * Math.cos(rad)))
        satelliteCircle.setAttribute('cy', String(ORBIT_GEOMETRY.cy + ORBIT_GEOMETRY.ry * Math.sin(rad)))
        ctx.gsap.set(satelliteCircle, { scale, autoAlpha: opacity })
      }

      ctx.gsap.set([wordmark, orbit, rings, topBridge, satelliteCircle, ship], {
        autoAlpha: 1,
        transformBox: 'fill-box',
        transformOrigin: '50% 50%'
      })
      ctx.gsap.set(rings, { svgOrigin: ORBIT_CENTER })
      ctx.gsap.set(satelliteCircle, { y: 0 })
      renderSatellite()
      ctx.gsap.set(scope, { '--efeonce-orbital-glow-opacity': 0 })

      if (ctx.reduced || resolvedVariant === 'static') {
        replayRef.current = () => undefined
        orbitState.angle = -90
        renderSatellite()
        ctx.gsap.set([wordmark, orbit, rings, topBridge, satelliteCircle, ship], {
          autoAlpha: 1,
          clearProps: 'transform'
        })

        return
      }

      const intro = ctx.gsap.timeline({
        paused: true,
        defaults: {
          overwrite: 'auto'
        }
      })

      intro
        .fromTo(
          wordmark,
          { autoAlpha: 0, y: 5 },
          { autoAlpha: 1, y: 0, duration: MOTION_DURATION_S.medium, ease: 'gh-emphasized' },
          0
        )
        .fromTo(
          ship,
          { autoAlpha: 0, scale: 0.985 },
          { autoAlpha: 1, scale: 1, duration: MOTION_DURATION_S.long, ease: 'gh-emphasized' },
          '<0.04'
        )
        .fromTo(
          rings,
          { autoAlpha: 0, rotation: -3, scale: 0.95 },
          { autoAlpha: 1, rotation: 0, scale: 1, duration: MOTION_DURATION_S.extended, ease: 'gh-emphasized' },
          '<0.05'
        )
        .fromTo(
          topBridge,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: MOTION_DURATION_S.medium, ease: 'gh-emphasized' },
          '<0.08'
        )
        .fromTo(
          satelliteCircle,
          { autoAlpha: 0, scale: 0.82 },
          { autoAlpha: 1, scale: 1, duration: MOTION_DURATION_S.medium, ease: 'gh-emphasized' },
          '<'
        )
        .to(orbitState, {
          angle: 270,
          duration: 1.9,
          ease: 'power2.inOut',
          onUpdate: renderSatellite
        })
        .to(satelliteCircle, {
          scale: 1.045,
          duration: MOTION_DURATION_S.instant,
          ease: 'gh-emphasized'
        })
        .to(satelliteCircle, {
          scale: 1,
          duration: MOTION_DURATION_S.standard,
          ease: 'gh-standard'
        })
        .to(
          scope,
          {
            '--efeonce-orbital-glow-opacity': 0.4,
            duration: MOTION_DURATION_S.short,
            ease: 'gh-emphasized'
          },
          '<'
        )
        .to(scope, {
          '--efeonce-orbital-glow-opacity': 0,
          duration: MOTION_DURATION_S.long,
          ease: 'gh-emphasized-accelerate'
        })

      const idle = ctx.gsap.timeline({ repeat: -1, yoyo: true, paused: true })

      idle
        .to(satelliteCircle, {
          y: -1.8,
          scale: 1.018,
          duration: 1.8,
          ease: 'sine.inOut'
        })
        .to(
          rings,
          {
            scale: 1.006,
            duration: 1.8,
            ease: 'sine.inOut'
          },
          '<'
        )
        .to(
          ship,
          {
            y: -0.65,
            duration: 1.8,
            ease: 'sine.inOut'
          },
          '<'
        )

      replayRef.current = () => {
        idle.pause(0)
        orbitState.angle = -90
        renderSatellite()
        intro.restart()
      }

      intro.eventCallback('onComplete', () => {
        if (resolvedVariant === 'ambient') idle.play(0)
      })

      intro.play(0)
    },
    { scope: scopeRef, dependencies: [resolvedVariant] }
  )

  const handleReplay = () => {
    if (replayOnHover) replayRef.current()
  }

  return (
    <Box
      component='span'
      ref={scopeRef}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : resolvedAriaLabel}
      aria-hidden={decorative ? 'true' : undefined}
      data-capture={dataCapture}
      data-kind='efeonce-orbital-logo-mark'
      onMouseEnter={handleReplay}
      onFocus={handleReplay}
      tabIndex={replayOnHover ? 0 : undefined}
      sx={[
        theme => ({
          '--efeonce-orbital-glow-opacity': 0,
          position: 'relative',
          display: 'inline-flex',
          inlineSize: 'min(100%, 520px)',
          color: EFEONCE_ORBITAL_LOGO_COLOR,
          outline: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            insetBlockStart: '18%',
            insetInlineStart: '34%',
            inlineSize: '24%',
            blockSize: '58%',
            borderRadius: '50%',
            opacity: 'var(--efeonce-orbital-glow-opacity)',
            backgroundColor: theme.palette.primary.main,
            filter: 'blur(34px)',
            transform: 'translateZ(0)',
            pointerEvents: 'none'
          },
          '&:focus-visible': {
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            boxShadow: `0 0 0 3px ${theme.palette.primary.main}`
          },
          '& svg': {
            position: 'relative',
            zIndex: 1,
            display: 'block',
            inlineSize: '100%',
            blockSize: 'auto',
            overflow: 'visible'
          },
          '& #efeonce-orbit-top-bridge, & #efeonce-orbiting-satellite-circle, & #efeonce-orbit-rings, & #efeonce-ship-upper-body, & #efeonce-ship-lower-body': {
            willChange: resolvedVariant === 'static' ? 'auto' : 'transform, opacity'
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <svg id='efeonce-logo-motion-copy' data-name='Efeonce logo motion copy' viewBox='0 0 837.07 196.68' aria-hidden='true' focusable='false'>
        <g id='efeonce-logo-artwork' data-name='Efeonce logo artwork'>
          <g id='efeonce-logo-lockup' data-name='Efeonce logo lockup'>
            <g id='efeonce-wordmark-letters' data-name='Efeonce wordmark letters' fill='currentColor'>
              <path d='M56.83,48.7c20.87-.2,44.73,5.17,44.13,30.42-.99,51.88-54.47,41.94-61.82,38.96-1.39,9.14,2.58,10.54,16.7,10.54,9.14,0,28.23-1.79,37.97-3.78l-4.77,27.04c-15.31,4.97-32.8,8.15-59.44,5.77-25.25-2.19-34.39-26.04-27.23-64.61,6.16-32.4,15.7-43.93,54.47-44.33ZM61.2,86.08c1.19-6.36-1.59-8.95-7.36-8.75-8.35.4-10.34,7.16-11.73,16.1,0,0,16.7,5.37,19.08-7.35Z' />
              <path d='M106.72,54.07l14.71-3.38,3.18-19.68C128.39,6.96,142.3,0,166.16,0c9.74,0,17.69.79,24.85,4.77l-3.58,22.07c-.2,0-14.51-.2-14.51-.2-9.94-.2-9.74,3.98-11.73,16.3l-1.19,7.75h19.48l-4.17,26.64h-19.48l-12.52,78.92h-38.57l12.52-78.92h-14.31l3.78-23.26Z' />
              <path d='M235.73,48.7c20.87-.2,44.73,5.17,44.13,30.42-.99,51.88-54.47,41.94-61.82,38.96-1.39,9.14,2.58,10.54,16.7,10.54,9.14,0,28.23-1.79,37.97-3.78l-4.77,27.04c-15.31,4.97-32.8,8.15-59.44,5.77-25.25-2.19-34.39-26.04-27.23-64.61,6.16-32.4,15.7-43.93,54.47-44.33ZM240.11,86.08c1.19-6.36-1.59-8.95-7.36-8.75-8.35.4-10.34,7.16-11.73,16.1,0,0,16.7,5.37,19.08-7.35Z' />
              <path d='M544.25,50.69h32.2l4.77,10.34c7.55-6.16,14.91-12.13,31.01-12.13,27.43,0,27.83,17.49,24.25,39.76l-10.73,67.59h-38.57l10.73-68.38c1.39-8.35-.4-10.34-4.77-10.34-7.36,0-12.52,1.99-15.71,7.36l-11.33,71.37h-38.57l16.7-105.56Z' />
              <path d='M688.17,48.7c10.34,0,34.79.99,50.29,7.16l-3.58,22.66s-11.73-1.19-29.42-1.19c-13.52,0-17.89.6-22.07,26.44-3.78,24.25-.4,24.85,13.92,24.85,18.29,0,31.41-1.59,31.41-1.59l-3.58,22.66c-14.51,6.56-27.63,7.95-53.87,7.55-19.68-.2-32.8-18.49-26.24-59.84,6.56-41.35,22.86-48.7,43.14-48.7Z' />
              <path d='M792.93,48.7c20.87-.2,44.73,5.17,44.13,30.42-.99,51.88-54.47,41.94-61.82,38.96-1.39,9.14,2.58,10.54,16.7,10.54,9.14,0,28.23-1.79,37.97-3.78l-4.77,27.04c-15.31,4.97-32.8,8.15-59.44,5.77-25.25-2.19-34.39-26.04-27.23-64.61,6.16-32.4,15.7-43.93,54.47-44.33ZM797.3,86.08c1.19-6.36-1.59-8.95-7.35-8.75-8.35.4-10.34,7.16-11.73,16.1,0,0,16.7,5.37,19.08-7.35Z' />
            </g>
            <g id='efeonce-orbit-mark' data-name='Efeonce orbit mark' fill='currentColor'>
              <g id='efeonce-orbit-rings' data-name='Efeonce orbit rings'>
                <path id='efeonce-orbit-ring-left' d='M295.76,101.14c0-25.43,35.88-46.73,84.03-52.26-.5-1.99-.76-4.07-.76-6.21,0-.15,0-.29.01-.44-55.19,5.79-96.6,29.96-96.6,58.91,0,19.69,19.16,37.17,48.78,48.16,1.54-2.09,2.69-4.49,3.37-7.08-23.73-9.84-38.82-24.59-38.82-41.08Z' />
                <path id='efeonce-orbit-ring-right' d='M430.09,42.23c0,.15.01.29.01.44,0,2.14-.27,4.22-.76,6.21,48.16,5.53,84.03,26.83,84.03,52.26,0,6.73-2.52,13.16-7.1,19.09,3.21,2.61,5.55,5.39,7.02,8.36,8.56-8.23,13.41-17.56,13.41-27.45,0-28.95-41.41-53.12-96.6-58.91Z' />
              </g>
              <path
                id='efeonce-orbit-top-bridge'
                d='M380.7 48.75 C394.4 47.3 410.9 47.3 429.35 48.88'
                fill='none'
                stroke='currentColor'
                strokeWidth='7.4'
                strokeLinecap='round'
              />
              <circle id='efeonce-orbiting-satellite-circle' cx='404.57' cy='44.13' r='20.76' />
              <path id='efeonce-ship-lower-body' d='M457.51,165.97l.6-.11h0s1.03-.21,1.03-.21c42.7-8.45,51.67-20.54,51.67-29.2v-.14c-.02-1.6-.33-3.12-.9-4.58-21.25,17.75-60.42,29.66-105.24,29.66-.78,0-1.55-.01-2.32-.02-24.73-.23-47.67-4.07-66.71-10.52-3.91,5.93-10.23,10.13-17.57,11.2-1.46.21-2.4,1.68-2,3.1,3.47,12.48,9.17,23.13,16.32,30.76.53.56,1.29.84,2.06.75,9.22-1.03,18.03-3.26,25.93-6.61,10.27-4.36,18.57-10.39,24.15-17.54,4.92-.04,9.78-.16,14.59-.35,10.52-.4,20.77-1.11,30.63-2.16,1.05-.11,2.1-.23,3.14-.35,6.35-.73,12.49-1.59,18.32-2.57l6.31-1.12Z' />
              <path id='efeonce-ship-upper-body' d='M451.21,105.81c-5.83-.98-11.97-1.85-18.32-2.57-1.04-.12-2.08-.23-3.14-.35-9.95-1.06-20.31-1.78-30.94-2.17-4.93-.18-9.91-.3-14.94-.34-5.69-6.93-13.97-12.77-24.11-16.97-7.74-3.21-16.34-5.35-25.32-6.35-.76-.09-1.53.19-2.06.75-7.15,7.63-12.85,18.28-16.32,30.76-.4,1.43.56,2.89,2.02,3.1,12.3,1.8,21.74,12.39,21.74,25.19,0,2.44-.35,4.8-.99,7.03,18.03,6.77,40.47,10.82,64.83,10.93.34,0,.67,0,1.01,0,43.83,0,81.6-12.78,98.84-31.2-9.89-8-28.19-13.17-44.36-16.37l-1.03-.2h0s-.6-.12-.6-.12l-6.31-1.12ZM397.41,138.17c-4.79.6-8.82-3.43-8.22-8.22.41-3.27,3.05-5.9,6.32-6.32,4.79-.6,8.82,3.43,8.22,8.22-.41,3.27-3.05,5.9-6.32,6.31ZM420.16,138.17c-4.79.6-8.83-3.43-8.22-8.22.41-3.27,3.05-5.9,6.32-6.31,4.79-.6,8.82,3.43,8.22,8.22-.41,3.27-3.05,5.9-6.31,6.32ZM442.91,138.17c-4.79.6-8.83-3.43-8.22-8.22.41-3.27,3.05-5.9,6.32-6.31,4.79-.6,8.82,3.43,8.22,8.22-.41,3.27-3.05,5.9-6.31,6.32Z' />
            </g>
          </g>
        </g>
      </svg>
    </Box>
  )
}

export default EfeonceOrbitalLogoMark
