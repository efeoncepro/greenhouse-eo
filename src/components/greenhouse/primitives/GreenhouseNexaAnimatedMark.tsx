'use client'

import { useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas'

import { MOTION_DURATION_S, useGreenhouseGSAP } from '@/components/greenhouse/motion'

import GreenhouseNexaBrandMark from './GreenhouseNexaBrandMark'
import {
  GREENHOUSE_NEXA_BRAND_COLORS,
  GREENHOUSE_NEXA_BRAND_SIZE_CONFIG,
  type GreenhouseNexaBrandKind,
  type GreenhouseNexaBrandSize
} from './greenhouse-nexa-brand-controller'

export type GreenhouseNexaAnimatedMarkProps = {
  riveSrc?: string
  artboard?: string
  animation?: string | string[]
  stateMachine?: string | string[]
  autoBlink?: boolean
  ambientMoments?: boolean
  ambientMoment?: 'random' | 'arcSparklePlay' | 'signalCatch'
  blinkCadence?: 'ambient' | 'attentive'
  chrome?: 'none' | 'badge'
  tone?: 'onNavy' | 'fullColor' | 'mono'
  kind?: GreenhouseNexaBrandKind
  size?: GreenhouseNexaBrandSize
  ariaLabel?: string
  decorative?: boolean
  dataCapture?: string
  sx?: SxProps<Theme>
}

type NexaRiveRendererProps = {
  riveSrc: string
  artboard?: string
  animation?: string | string[]
  stateMachine?: string | string[]
  onUnavailable: () => void
}

const NEXA_BLINK_CADENCE = {
  ambient: {
    initialDelay: [2.4, 4.2],
    interval: [6, 11],
    doubleBlinkChance: 0.12
  },
  attentive: {
    initialDelay: [0.8, 1.6],
    interval: [2.8, 5.2],
    doubleBlinkChance: 0.24
  }
} as const

const NEXA_AMBIENT_MOMENTS_CADENCE = {
  initialDelay: [4.8, 7.2],
  interval: [28, 48],
  cooldown: [4, 7],
  arcSparklePlayChance: 0.64
} as const

const NexaRiveRenderer = ({
  riveSrc,
  artboard,
  animation,
  stateMachine,
  onUnavailable
}: NexaRiveRendererProps) => {
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])

  const { RiveComponent } = useRive(
    {
      src: riveSrc,
      artboard,
      animations: animation,
      stateMachines: stateMachine,
      autoplay: true,
      layout,
      onLoadError: onUnavailable
    },
    {
      useDevicePixelRatio: true,
      shouldResizeCanvasToContainer: true
    }
  )

  return <RiveComponent aria-hidden='true' />
}

type NexaGsapBlinkMarkProps = {
  autoBlink: boolean
  ambientMoments: boolean
  ambientMoment: NonNullable<GreenhouseNexaAnimatedMarkProps['ambientMoment']>
  blinkCadence: keyof typeof NEXA_BLINK_CADENCE
  chrome: 'none' | 'badge'
  tone: 'onNavy' | 'fullColor' | 'mono'
  size: GreenhouseNexaBrandSize
  ariaLabel: string
  decorative: boolean
  dataCapture?: string
  sx?: SxProps<Theme>
}

const NexaGsapBlinkMark = ({
  autoBlink,
  ambientMoments,
  ambientMoment,
  blinkCadence,
  chrome,
  tone,
  size,
  ariaLabel,
  decorative,
  dataCapture,
  sx
}: NexaGsapBlinkMarkProps) => {
  const scopeRef = useRef<HTMLSpanElement | null>(null)
  const sizeConfig = GREENHOUSE_NEXA_BRAND_SIZE_CONFIG[size]
  const isBadge = chrome === 'badge'
  const markColor = tone === 'fullColor' ? GREENHOUSE_NEXA_BRAND_COLORS.coreBlue : 'currentColor'
  const arcColor = tone === 'mono' ? 'currentColor' : GREENHOUSE_NEXA_BRAND_COLORS.electricTeal

  useGreenhouseGSAP(
    ctx => {
      const sparkle = scopeRef.current?.querySelector('.gh-nexa-sparkle-eye')
      const arc = scopeRef.current?.querySelector('.gh-nexa-arc')
      const arcPulse = scopeRef.current?.querySelector('.gh-nexa-arc-pulse')
      const arcHighlight = scopeRef.current?.querySelector('.gh-nexa-arc-highlight')

      if (!sparkle || !arc || !arcPulse || !arcHighlight) return

      ctx.gsap.set([sparkle, arc, arcPulse, arcHighlight], { transformBox: 'fill-box', transformOrigin: '50% 50%' })
      ctx.gsap.set(sparkle, { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0 })
      ctx.gsap.set(arc, { scaleX: 1, scaleY: 1, x: 0, y: 0, strokeWidth: 4 })
      ctx.gsap.set(arcPulse, { autoAlpha: 0, scale: 1, strokeWidth: 3 })
      ctx.gsap.set(arcHighlight, { autoAlpha: 0, strokeDasharray: 14, strokeDashoffset: 26 })

      if (ctx.reduced || (!autoBlink && !ambientMoments)) return

      const cadence = NEXA_BLINK_CADENCE[blinkCadence]
      const ambientCadence = NEXA_AMBIENT_MOMENTS_CADENCE
      let busy = false

      const runMoment = (timeline: ReturnType<typeof ctx.gsap.timeline>): boolean => {
        if (busy) return false

        busy = true
        timeline.eventCallback('onComplete', () => {
          busy = false
        })
        timeline.restart()

        return true
      }

      const blink = ctx.gsap.timeline({ paused: true })

      blink
        .to(sparkle, {
          scaleY: 0.04,
          scaleX: 1.14,
          y: 0.5,
          duration: MOTION_DURATION_S.instant,
          ease: 'gh-emphasized-accelerate'
        })
        .to(sparkle, {
          scaleY: 0.04,
          scaleX: 1.14,
          y: 0.5,
          duration: MOTION_DURATION_S.instant / 2,
          ease: 'none'
        })
        .to(sparkle, {
          scaleY: 1,
          scaleX: 1,
          y: 0,
          duration: MOTION_DURATION_S.standard,
          ease: 'gh-emphasized'
        })

      const arcSparklePlay = ctx.gsap.timeline({ paused: true })

      arcSparklePlay
        .to(arc, {
          scaleX: 1.06,
          y: -0.35,
          strokeWidth: 4.4,
          duration: MOTION_DURATION_S.short,
          ease: 'gh-emphasized'
        })
        .to(
          sparkle,
          {
            scale: 1.2,
            x: 1.1,
            y: -1.2,
            rotation: 8,
            duration: MOTION_DURATION_S.short,
            ease: 'gh-emphasized'
          },
          '<'
        )
        .to(
          arcHighlight,
          {
            autoAlpha: 0.8,
            strokeDashoffset: 0,
            duration: MOTION_DURATION_S.standard,
            ease: 'gh-standard'
          },
          '<0.04'
        )
        .to(
          arcHighlight,
          {
            autoAlpha: 0,
            duration: MOTION_DURATION_S.short,
            ease: 'gh-emphasized-accelerate'
          },
          '>-0.05'
        )
        .to(
          [arc, sparkle],
          {
            scaleX: 1,
            scaleY: 1,
            scale: 1,
            x: 0,
            y: 0,
            rotation: 0,
            strokeWidth: 4,
            duration: MOTION_DURATION_S.standard,
            ease: 'gh-emphasized'
          },
          '<'
        )

      const signalCatch = ctx.gsap.timeline({ paused: true })

      signalCatch
        .to(sparkle, {
          x: -4.2,
          y: 5.8,
          scale: 0.84,
          rotation: -10,
          duration: MOTION_DURATION_S.short,
          ease: 'gh-emphasized-accelerate'
        })
        .to(
          arc,
          {
            scaleX: 1.04,
            strokeWidth: 4.8,
            duration: MOTION_DURATION_S.short,
            ease: 'gh-emphasized'
          },
          '>-0.04'
        )
        .to(
          arcPulse,
          {
            autoAlpha: 0.55,
            scale: 1.05,
            duration: MOTION_DURATION_S.instant,
            ease: 'none'
          },
          '<'
        )
        .to(arcPulse, {
          autoAlpha: 0,
          scale: 1.42,
          strokeWidth: 1.4,
          duration: MOTION_DURATION_S.standard,
          ease: 'gh-emphasized'
        })
        .to(
          sparkle,
          {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            duration: MOTION_DURATION_S.standard,
            ease: 'gh-emphasized'
          },
          '<0.04'
        )
        .to(
          arc,
          {
            scaleX: 1,
            strokeWidth: 4,
            duration: MOTION_DURATION_S.standard,
            ease: 'gh-emphasized'
          },
          '<'
        )

      const playBlink = () => {
        if (!autoBlink) return

        runMoment(blink)

        if (Math.random() < cadence.doubleBlinkChance) {
          ctx.gsap.delayedCall(0.24, () => {
            if (!busy) runMoment(blink)
          })
        }
      }

      const scheduleBlink = (delayRange: readonly [number, number] = cadence.interval) => {
        ctx.gsap.delayedCall(ctx.gsap.utils.random(delayRange[0], delayRange[1]), () => {
          playBlink()
          scheduleBlink()
        })
      }

      const playAmbientMoment = () => {
        if (!ambientMoments) return

        const timeline = (() => {
          if (ambientMoment === 'arcSparklePlay') return arcSparklePlay
          if (ambientMoment === 'signalCatch') return signalCatch

          return Math.random() < ambientCadence.arcSparklePlayChance ? arcSparklePlay : signalCatch
        })()

        const played = runMoment(timeline)

        if (!played) {
          ctx.gsap.delayedCall(ctx.gsap.utils.random(2, 4), playAmbientMoment)
        }
      }

      const scheduleAmbientMoment = (delayRange: readonly [number, number] = ambientCadence.interval) => {
        ctx.gsap.delayedCall(ctx.gsap.utils.random(delayRange[0], delayRange[1]), () => {
          playAmbientMoment()
          ctx.gsap.delayedCall(ctx.gsap.utils.random(ambientCadence.cooldown[0], ambientCadence.cooldown[1]), () => {
            scheduleAmbientMoment()
          })
        })
      }

      if (autoBlink) scheduleBlink(cadence.initialDelay)
      if (ambientMoments) scheduleAmbientMoment(ambientCadence.initialDelay)
    },
    { scope: scopeRef, dependencies: [ambientMoment, ambientMoments, autoBlink, blinkCadence] }
  )

  return (
    <Box
      component='span'
      ref={scopeRef}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? 'true' : undefined}
      data-capture={dataCapture}
      data-kind='nexa-gsap-blink-mark'
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: sizeConfig.iconOnlySize,
          blockSize: sizeConfig.iconOnlySize,
          borderRadius: isBadge ? `${theme.shape.customBorderRadius.md}px` : 0,
          backgroundColor: isBadge ? GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy : 'transparent',
          color: tone === 'fullColor' ? GREENHOUSE_NEXA_BRAND_COLORS.coreBlue : theme.palette.common.white,
          overflow: 'hidden',
          verticalAlign: 'middle',
          '& svg': {
            display: 'block',
            inlineSize: isBadge ? '78%' : '100%',
            blockSize: isBadge ? '78%' : '100%',
            overflow: 'visible'
          },
          '& .gh-nexa-sparkle-eye': {
            willChange: autoBlink || ambientMoments ? 'transform' : 'auto',
            transformBox: 'fill-box',
            transformOrigin: 'center'
          },
          '& .gh-nexa-arc, & .gh-nexa-arc-pulse, & .gh-nexa-arc-highlight': {
            willChange: ambientMoments ? 'transform, opacity' : 'auto',
            transformBox: 'fill-box',
            transformOrigin: 'center'
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <svg viewBox='0 0 48 48' aria-hidden='true' focusable='false'>
        <path
          className='gh-nexa-arc-pulse'
          d='M9 27 Q19 39 29 27'
          fill='none'
          stroke={arcColor}
          strokeWidth='3'
          strokeLinecap='round'
          opacity='0'
        />
        <path
          className='gh-nexa-arc'
          d='M9 27 Q19 39 29 27'
          fill='none'
          stroke={arcColor}
          strokeWidth='4'
          strokeLinecap='round'
        />
        <path
          className='gh-nexa-arc-highlight'
          d='M9 27 Q19 39 29 27'
          fill='none'
          stroke={markColor}
          strokeWidth='2'
          strokeLinecap='round'
          opacity='0'
        />
        <path
          className='gh-nexa-sparkle-eye'
          d='M34 9 C35 12.5 36.5 14 40 15 C36.5 16 35 17.5 34 21 C33 17.5 31.5 16 28 15 C31.5 14 33 12.5 34 9 Z'
          fill={markColor}
        />
      </svg>
    </Box>
  )
}

const GreenhouseNexaAnimatedMark = ({
  riveSrc,
  artboard,
  animation,
  stateMachine,
  autoBlink = false,
  ambientMoments = false,
  ambientMoment = 'random',
  blinkCadence = 'attentive',
  chrome,
  tone,
  kind = 'badgeIcon',
  size = 'medium',
  ariaLabel = 'Nexa',
  decorative = false,
  dataCapture,
  sx
}: GreenhouseNexaAnimatedMarkProps) => {
  const [riveUnavailable, setRiveUnavailable] = useState(false)
  const sizeConfig = GREENHOUSE_NEXA_BRAND_SIZE_CONFIG[size]

  if ((autoBlink || ambientMoments) && (!riveSrc || riveUnavailable)) {
    return (
      <NexaGsapBlinkMark
        autoBlink={autoBlink}
        ambientMoments={ambientMoments}
        ambientMoment={ambientMoment}
        blinkCadence={blinkCadence}
        chrome={chrome ?? (kind === 'badgeIcon' ? 'badge' : 'none')}
        tone={tone ?? (kind === 'inlineMark' ? 'fullColor' : 'onNavy')}
        size={size}
        ariaLabel={ariaLabel}
        decorative={decorative}
        dataCapture={dataCapture}
        sx={sx}
      />
    )
  }

  if (!riveSrc || riveUnavailable) {
    return <GreenhouseNexaBrandMark kind={kind} size={size} ariaLabel={ariaLabel} dataCapture={dataCapture} sx={sx} />
  }

  return (
    <Box
      component='span'
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? 'true' : undefined}
      data-capture={dataCapture}
      data-kind='nexa-rive-mark'
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: sizeConfig.iconOnlySize,
          blockSize: sizeConfig.iconOnlySize,
          overflow: 'hidden',
          verticalAlign: 'middle',
          '& canvas': {
            display: 'block',
            inlineSize: '100% !important',
            blockSize: '100% !important'
          }
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <NexaRiveRenderer
        riveSrc={riveSrc}
        artboard={artboard}
        animation={animation}
        stateMachine={stateMachine}
        onUnavailable={() => setRiveUnavailable(true)}
      />
    </Box>
  )
}

export default GreenhouseNexaAnimatedMark
