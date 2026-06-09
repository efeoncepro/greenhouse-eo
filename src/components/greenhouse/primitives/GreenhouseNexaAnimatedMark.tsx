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
  blinkCadence?: 'ambient' | 'attentive'
  chrome?: 'none' | 'badge'
  tone?: 'onNavy' | 'fullColor' | 'mono'
  kind?: GreenhouseNexaBrandKind
  size?: GreenhouseNexaBrandSize
  ariaLabel?: string
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
  blinkCadence: keyof typeof NEXA_BLINK_CADENCE
  chrome: 'none' | 'badge'
  tone: 'onNavy' | 'fullColor' | 'mono'
  size: GreenhouseNexaBrandSize
  ariaLabel: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

const NexaGsapBlinkMark = ({
  autoBlink,
  blinkCadence,
  chrome,
  tone,
  size,
  ariaLabel,
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

      if (!sparkle) return

      ctx.gsap.set(sparkle, {
        transformBox: 'fill-box',
        transformOrigin: '50% 50%',
        scaleX: 1,
        scaleY: 1,
        y: 0
      })

      if (ctx.reduced || !autoBlink) return

      const cadence = NEXA_BLINK_CADENCE[blinkCadence]

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

      const playBlink = () => {
        blink.restart()

        if (Math.random() < cadence.doubleBlinkChance) {
          ctx.gsap.delayedCall(0.22, () => blink.restart())
        }
      }

      const scheduleBlink = (delayRange: readonly [number, number] = cadence.interval) => {
        ctx.gsap.delayedCall(ctx.gsap.utils.random(delayRange[0], delayRange[1]), () => {
          playBlink()
          scheduleBlink()
        })
      }

      scheduleBlink(cadence.initialDelay)
    },
    { scope: scopeRef, dependencies: [autoBlink, blinkCadence] }
  )

  return (
    <Box
      component='span'
      ref={scopeRef}
      role='img'
      aria-label={ariaLabel}
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
            willChange: autoBlink ? 'transform' : 'auto',
            transformBox: 'fill-box',
            transformOrigin: 'center'
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <svg viewBox='0 0 48 48' aria-hidden='true' focusable='false'>
        <path d='M9 27 Q19 39 29 27' fill='none' stroke={arcColor} strokeWidth='4' strokeLinecap='round' />
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
  blinkCadence = 'attentive',
  chrome,
  tone,
  kind = 'badgeIcon',
  size = 'medium',
  ariaLabel = 'Nexa',
  dataCapture,
  sx
}: GreenhouseNexaAnimatedMarkProps) => {
  const [riveUnavailable, setRiveUnavailable] = useState(false)
  const sizeConfig = GREENHOUSE_NEXA_BRAND_SIZE_CONFIG[size]

  if (autoBlink && (!riveSrc || riveUnavailable)) {
    return (
      <NexaGsapBlinkMark
        autoBlink={autoBlink}
        blinkCadence={blinkCadence}
        chrome={chrome ?? (kind === 'badgeIcon' ? 'badge' : 'none')}
        tone={tone ?? (kind === 'inlineMark' ? 'fullColor' : 'onNavy')}
        size={size}
        ariaLabel={ariaLabel}
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
      role='img'
      aria-label={ariaLabel}
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
