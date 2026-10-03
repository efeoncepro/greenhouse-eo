'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import NextLink from 'next/link'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { alpha, keyframes } from '@mui/material/styles'

import { MOTION_EASE, cssCubicBezier } from '@/components/greenhouse/motion/core/tokens'
import { ORBIT_TOKENS, QUESTION_RING, answerSphere, lineAccentOnDark } from '@/components/greenhouse/motion/orbit-geometry'
import { GH_MESSAGES } from '@/lib/copy/client-portal'
import type { LoginAnnouncementDto } from '@/lib/login-announcements/types'

import LoginLens from './LoginLens'
import { bricolage } from './login-fonts'
import { LOGIN_CAROUSEL_INTERVAL_MS, LOGIN_CAROUSEL_TICK_MS, LOGIN_STAGE_FALLBACK, LOGIN_STAGE_TYPE } from './login-constants'

/**
 * TASK-1964 — Escenario del login V4: foto con la Lente de «La órbita» y el carrusel de novedades (TASK-1963).
 *
 * - `variant="panel"`: escenario a todo el alto junto al formulario (desktop).
 * - `variant="card"`: tarjeta bajo el formulario (móvil; el login es la prioridad).
 *
 * Carrusel accesible: pestañas con `aria-current`, botón de pausa (WCAG 2.2.2), se detiene con hover o foco y arranca
 * pausado con `prefers-reduced-motion`. Sin novedades muestra la foto por defecto sin texto ni pestañas.
 */

const emphasized = cssCubicBezier(MOTION_EASE.emphasized.cubicBezier)

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const kenBurns = keyframes`
  from { transform: scale(1.07); }
  to { transform: scale(1); }
`

const rise = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
`

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const isExternal = (url: string) => url.startsWith('https://')

export type LoginStageProps = {
  announcements: LoginAnnouncementDto[]
  variant: 'panel' | 'card'
  /** Avisa la lente de la novedad activa: el acceso se abre desde su centro. */
  onActiveLensChange?: (lens: LoginAnnouncementDto['lens']) => void
}

const LoginStage = ({ announcements, variant, onActiveLensChange }: LoginStageProps) => {
  const count = announcements.length
  const [index, setIndex] = useState(0)
  const [previous, setPrevious] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const reducedRef = useRef(false)

  useEffect(() => {
    reducedRef.current = prefersReducedMotion()
    if (reducedRef.current) setPaused(true)
  }, [])

  const go = useCallback(
    (next: number) => {
      if (count === 0) return
      const target = ((next % count) + count) % count

      if (target === index) return
      setPrevious(index)
      setIndex(target)
      setElapsed(0)
    },
    [count, index]
  )

  // Reloj del carrusel: avanza el progreso de la pestaña activa; al completar el intervalo pasa a la siguiente.
  useEffect(() => {
    if (count < 2 || paused || held) return

    const timer = window.setInterval(() => setElapsed(value => value + LOGIN_CAROUSEL_TICK_MS), LOGIN_CAROUSEL_TICK_MS)

    return () => window.clearInterval(timer)
  }, [count, paused, held])

  useEffect(() => {
    if (elapsed >= LOGIN_CAROUSEL_INTERVAL_MS) go(index + 1)
  }, [elapsed, go, index])

  const isPanel = variant === 'panel'
  const active = announcements[index]

  useEffect(() => {
    if (!onActiveLensChange) return
    onActiveLensChange(active ? (active.kind === 'banner' ? null : active.lens) : LOGIN_STAGE_FALLBACK.lens)
  }, [active, onActiveLensChange])
  const progress = Math.min(100, (elapsed / LOGIN_CAROUSEL_INTERVAL_MS) * 100)
  const accent = lineAccentOnDark(active?.serviceLine)
  const headline = (active?.title ?? '').replace(/\.+$/, '')
  const sphere = answerSphere(headline)

  const layer = (
    item: Pick<LoginAnnouncementDto, 'image' | 'lens' | 'kind'> & { id: string; serviceLine?: string },
    isActive: boolean
  ) => (
    <Box
      key={item.id}
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: isActive ? 2 : 1,
        bgcolor: ORBIT_TOKENS.color.dark,
        animation: isActive && previous !== null ? `${fadeIn} 1200ms ${emphasized} both` : 'none',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
      }}
    >
      {item.kind === 'banner' && item.image ? (
        <Box
          component='img'
          src={item.image.path}
          alt={item.image.alt}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : item.image && !item.lens && item.id !== 'fallback' ? (
        // Foto en registro cine: la luz de la escena ya es la órbita de la pieza y va una sola por pieza, así que
        // no se dibuja la lente; la reserva oscura de la propia toma sostiene el texto.
        <Box
          component='img'
          src={item.image.path}
          alt={item.image.alt}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            animation: isPanel ? `${kenBurns} 10s ${emphasized} both` : 'none',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
          }}
        />
      ) : item.image ? (
        <LoginLens
          src={item.image.path}
          alt={item.image.alt}
          lens={item.lens ?? LOGIN_STAGE_FALLBACK.lens!}
          accent={lineAccentOnDark(item.serviceLine)}
          drift={isPanel}
        />
      ) : null}
    </Box>
  )

  const fallback = { id: 'fallback', kind: 'text' as const, ...LOGIN_STAGE_FALLBACK }

  return (
    <Box
      component='section'
      aria-roledescription={count > 1 ? 'carrusel' : undefined}
      aria-label={GH_MESSAGES.login_stage_label}
      data-capture='login-stage'
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false)
      }}
      className={bricolage.variable}
      sx={{
        overflow: 'hidden',
        containerType: 'size',
        bgcolor: ORBIT_TOKENS.color.dark,
        color: 'common.white',
        borderRadius: theme => `${theme.shape.customBorderRadius.display}px`,
        height: isPanel ? 'calc(100dvh - 24px)' : 380,
        minHeight: isPanel ? 640 : undefined,
        position: isPanel ? 'sticky' : 'relative',
        top: isPanel ? 12 : undefined
      }}
    >
      {count === 0 ? layer(fallback, true) : null}
      {count > 0 && previous !== null && previous !== index ? layer(announcements[previous], false) : null}
      {count > 0 ? layer(active, true) : null}

      {count > 0 ? (
        <Box
          aria-live={paused ? 'polite' : 'off'}
          sx={{
            position: 'absolute',
            zIndex: 3,
            left: isPanel ? 56 : 22,
            right: isPanel ? 56 : 22,
            bottom: isPanel ? 112 : count > 1 ? 72 : 22,
            maxWidth: isPanel ? 520 : undefined,
            pointerEvents: 'none'
          }}
        >
          {active.kind === 'text' ? (
            <Box
              key={active.id}
              role='group'
              aria-roledescription={count > 1 ? 'diapositiva' : undefined}
              aria-label={`${index + 1} ${GH_MESSAGES.login_stage_slide_of} ${count}`}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: isPanel ? 1.75 : 1,
                '& > *': { animation: `${rise} 700ms ${emphasized} both` },
                '& > :nth-of-type(1)': { animationDelay: '700ms' },
                '& > :nth-of-type(2)': { animationDelay: '850ms' },
                '& > :nth-of-type(n+3)': { animationDelay: '1000ms' },
                '@media (prefers-reduced-motion: reduce)': { '& > *': { animation: 'none' } }
              }}
            >
              {active.kicker ? (
                <Typography variant='overline' sx={{ color: theme => alpha(theme.palette.common.white, 0.82) }}>
                  {/* La voz que abre lleva el anillo pequeño delante, en el acento de la línea (`efeonce-graphic-line` §4). */}
                  <Box
                    component='span'
                    aria-hidden='true'
                    sx={{
                      display: 'inline-block',
                      width: `${QUESTION_RING.sizeEm}em`,
                      height: `${QUESTION_RING.sizeEm}em`,
                      border: `max(1px, ${QUESTION_RING.strokeEm}em) solid ${accent}`,
                      borderRadius: '50%',
                      mr: `${QUESTION_RING.gapEm}em`,
                      verticalAlign: `${QUESTION_RING.baselineEm}em`
                    }}
                  />
                  {active.kicker}
                </Typography>
              ) : null}
              <Typography
                component='p'
                sx={{
                  fontFamily: bricolage.style.fontFamily, // ui-code-lint-disable-line — voz `idea` de «La órbita» (next/font)
                  color: 'common.white',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  ...(isPanel ? LOGIN_STAGE_TYPE.headline : LOGIN_STAGE_TYPE.headlineCard)
                }}
              >
                {/* La respuesta cierra con la esfera: es parte del texto y reemplaza al punto tipeado. */}
                {headline}
                <Box
                  component='span'
                  aria-hidden='true'
                  sx={{
                    display: 'inline-block',
                    width: `${sphere.diameterEm}em`,
                    height: `${sphere.diameterEm}em`,
                    borderRadius: '50%',
                    bgcolor: accent,
                    ml: `${sphere.gapEm}em`
                  }}
                />
              </Typography>
              {active.body && isPanel ? (
                <Typography variant='body1' sx={{ color: theme => alpha(theme.palette.common.white, 0.82), maxWidth: 440 }}>
                  {active.body}
                </Typography>
              ) : null}
              {active.cta ? (
                <Box
                  component={isExternal(active.cta.url) ? 'a' : NextLink}
                  href={active.cta.url}
                  {...(isExternal(active.cta.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  sx={{
                    pointerEvents: 'auto',
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 24, // área táctil WCAG 2.5.8
                    mt: 0.5,
                    color: 'common.white',
                    typography: 'body2',
                    fontWeight: 500,
                    textUnderlineOffset: '3px',
                    '&:hover': { color: theme => alpha(theme.palette.common.white, 0.82) }
                  }}
                >
                  {active.cta.label} →
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      ) : null}

      {count > 0 && active.kind === 'banner' && active.image && active.cta ? (
        <Box
          component={isExternal(active.cta.url) ? 'a' : NextLink}
          href={active.cta.url}
          {...(isExternal(active.cta.url) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          aria-label={active.image.alt}
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'common.white', outlineOffset: -6 }
          }}
        />
      ) : null}

      {count > 1 ? (
        <Box
          sx={{
            position: 'absolute',
            zIndex: 4,
            left: isPanel ? 56 : 22,
            right: isPanel ? 40 : 14,
            bottom: isPanel ? 36 : 14,
            display: 'flex',
            alignItems: 'flex-end',
            gap: isPanel ? 3 : 1.5
          }}
        >
          <Box
            sx={{
              flex: '1 1 auto',
              maxWidth: isPanel ? 520 : undefined,
              display: 'grid',
              gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
              gap: isPanel ? 2.5 : 1.25
            }}
          >
            {announcements.map((item, position) => {
              const fill = position < index ? 100 : position === index ? progress : 0

              return (
                <ButtonBase
                  key={item.id}
                  onClick={() => go(position)}
                  aria-label={`${GH_MESSAGES.login_stage_go_to} ${position + 1}: ${item.tabLabel}`}
                  aria-current={position === index ? 'true' : undefined}
                  sx={{
                    minHeight: 44,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-end',
                    gap: 1.25,
                    textAlign: 'left',
                    typography: 'overline',
                    color: theme => (position === index ? theme.palette.common.white : alpha(theme.palette.common.white, 0.6)),
                    transition: theme => theme.transitions.create('color'),
                    '&:hover': { color: 'common.white' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'common.white', outlineOffset: 4 }
                  }}
                >
                  <span>{item.tabLabel}</span>
                  <Box
                    component='span'
                    aria-hidden='true'
                    sx={{
                      display: 'block',
                      height: 2,
                      borderRadius: 9999,
                      overflow: 'hidden',
                      bgcolor: theme => alpha(theme.palette.common.white, 0.22)
                    }}
                  >
                    <Box component='span' sx={{ display: 'block', height: '100%', width: `${fill}%`, bgcolor: 'common.white' }} />
                  </Box>
                </ButtonBase>
              )
            })}
          </Box>
          <IconButton
            onClick={() => setPaused(value => !value)}
            aria-label={paused ? GH_MESSAGES.login_stage_resume : GH_MESSAGES.login_stage_pause}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              ml: 'auto',
              color: 'common.white',
              border: '1px solid',
              borderColor: theme => alpha(theme.palette.common.white, 0.3)
            }}
          >
            <i className={paused ? 'tabler-player-play-filled' : 'tabler-player-pause-filled'} aria-hidden='true' />
          </IconButton>
        </Box>
      ) : null}
    </Box>
  )
}

export default LoginStage
