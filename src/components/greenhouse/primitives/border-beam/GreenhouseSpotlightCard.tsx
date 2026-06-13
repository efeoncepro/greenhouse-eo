'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import GlobalStyles from '@mui/material/GlobalStyles'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

import { GREENHOUSE_NEXA_BRAND_COLORS } from '../greenhouse-nexa-brand-controller'

export type GreenhouseSpotlightCardKind = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'nexaBrand'

export type GreenhouseSpotlightCardSize = 'sm' | 'md' | 'lg' | 'custom'

export interface GreenhouseSpotlightCardProps {
  children?: ReactNode
  contentSx?: SxProps<Theme>
  dataCapture?: string
  height?: number | string
  kind?: GreenhouseSpotlightCardKind
  size?: GreenhouseSpotlightCardSize
  sx?: SxProps<Theme>
  width?: number | string
}

const SPOTLIGHT_KIND_CONFIG: Record<GreenhouseSpotlightCardKind, { base: number; spread: number }> = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
  nexaBrand: { base: 188, spread: 34 }
}

const SPOTLIGHT_SIZE_CONFIG: Record<Exclude<GreenhouseSpotlightCardSize, 'custom'>, { width: number; height: number }> = {
  sm: { width: 192, height: 256 },
  md: { width: 256, height: 320 },
  lg: { width: 320, height: 384 }
}

const spotlightCardGlobalStyles = (
  <GlobalStyles
    styles={{
      '[data-gh-spotlight-card]::before, [data-gh-spotlight-card]::after': {
        pointerEvents: 'none',
        content: '""',
        position: 'absolute',
        inset: 'calc(var(--gh-spotlight-border-size) * -1)',
        border: 'var(--gh-spotlight-border-size) solid transparent',
        borderRadius: 'inherit',
        backgroundAttachment: 'scroll',
        backgroundSize: 'calc(100% + (2 * var(--gh-spotlight-border-size))) calc(100% + (2 * var(--gh-spotlight-border-size)))',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '50% 50%',
        WebkitMask: 'linear-gradient(transparent, transparent), linear-gradient(white, white)',
        WebkitMaskClip: 'padding-box, border-box',
        WebkitMaskComposite: 'source-in',
        mask: 'linear-gradient(transparent, transparent), linear-gradient(white, white)',
        maskClip: 'padding-box, border-box',
        maskComposite: 'intersect'
      },
      '[data-gh-spotlight-card]::before': {
        backgroundImage:
          'radial-gradient(calc(var(--gh-spotlight-size) * 0.75) calc(var(--gh-spotlight-size) * 0.75) at calc(var(--gh-spotlight-x, 0) * 1px) calc(var(--gh-spotlight-y, 0) * 1px), var(--gh-spotlight-border-color), transparent 100%)',
        filter: 'brightness(1.85)'
      },
      '[data-gh-spotlight-card]::after': {
        backgroundImage:
          'radial-gradient(calc(var(--gh-spotlight-size) * 0.5) calc(var(--gh-spotlight-size) * 0.5) at calc(var(--gh-spotlight-x, 0) * 1px) calc(var(--gh-spotlight-y, 0) * 1px), var(--gh-spotlight-light-color), transparent 100%)'
      },
      '[data-gh-spotlight-aura]': {
        position: 'absolute',
        inset: 0,
        opacity: 'var(--gh-spotlight-outer-opacity)',
        borderRadius: 'inherit',
        filter: 'blur(calc(var(--gh-spotlight-border-size) * 10))',
        pointerEvents: 'none',
        willChange: 'filter'
      },
      '[data-gh-spotlight-orb]': {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        borderRadius: 'inherit',
        pointerEvents: 'none',
        opacity: 'var(--gh-spotlight-orb-opacity)',
        background:
          'radial-gradient(var(--gh-spotlight-orb-size) var(--gh-spotlight-orb-size) at calc(var(--gh-spotlight-x, 0) * 1px) calc(var(--gh-spotlight-y, 0) * 1px), var(--gh-spotlight-orb-color), transparent 68%)',
        filter: 'saturate(1.25)',
        transition: 'opacity 180ms ease'
      },
      '[data-gh-spotlight-aura]::before': {
        pointerEvents: 'none',
        content: '""',
        position: 'absolute',
        inset: -10,
        border: '10px solid transparent',
        borderRadius: 'inherit',
        backgroundAttachment: 'scroll',
        backgroundSize: 'calc(100% + (2 * var(--gh-spotlight-border-size))) calc(100% + (2 * var(--gh-spotlight-border-size)))',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '50% 50%',
        backgroundImage:
          'radial-gradient(calc(var(--gh-spotlight-size) * 0.75) calc(var(--gh-spotlight-size) * 0.75) at calc(var(--gh-spotlight-x, 0) * 1px) calc(var(--gh-spotlight-y, 0) * 1px), var(--gh-spotlight-border-color), transparent 100%)',
        WebkitMask: 'linear-gradient(transparent, transparent), linear-gradient(white, white)',
        WebkitMaskClip: 'padding-box, border-box',
        WebkitMaskComposite: 'source-in',
        mask: 'linear-gradient(transparent, transparent), linear-gradient(white, white)',
        maskClip: 'padding-box, border-box',
        maskComposite: 'intersect'
      },
      '@media (prefers-reduced-motion: reduce)': {
        '[data-gh-spotlight-content]': {
          transition: 'none'
        }
      },
      '@media (forced-colors: active)': {
        '[data-gh-spotlight-card]': {
          border: '1px solid CanvasText !important',
          background: 'Canvas !important'
        },
        '[data-gh-spotlight-card]::before, [data-gh-spotlight-card]::after, [data-gh-spotlight-aura], [data-gh-spotlight-orb]': {
          display: 'none'
        }
      }
    }}
  />
)

const resolveCssSize = (value: number | string | undefined) => (typeof value === 'number' ? `${value}px` : value)

const GreenhouseSpotlightCard = ({
  children,
  contentSx,
  dataCapture,
  height,
  kind = 'blue',
  size = 'md',
  sx,
  width
}: GreenhouseSpotlightCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const kindConfig = SPOTLIGHT_KIND_CONFIG[kind]
  const sizeConfig = size === 'custom' ? undefined : SPOTLIGHT_SIZE_CONFIG[size]

  useEffect(() => {
    const setPointer = (clientX: number, clientY: number) => {
      const card = cardRef.current

      if (!card) return

      const rect = card.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      card.style.setProperty('--gh-spotlight-x', x.toFixed(2))
      card.style.setProperty('--gh-spotlight-y', y.toFixed(2))
      card.style.setProperty('--gh-spotlight-xp', (x / Math.max(rect.width, 1)).toFixed(2))
      card.style.setProperty('--gh-spotlight-yp', (y / Math.max(rect.height, 1)).toFixed(2))
    }

    const syncPointer = (event: PointerEvent) => setPointer(event.clientX, event.clientY)
    const rect = cardRef.current?.getBoundingClientRect()

    if (rect) setPointer(rect.left + rect.width / 2, rect.top + rect.height / 2)

    document.addEventListener('pointermove', syncPointer, { passive: true })

    return () => document.removeEventListener('pointermove', syncPointer)
  }, [])

  return (
    <>
      {spotlightCardGlobalStyles}
      <Box
        ref={cardRef}
        data-capture={dataCapture}
        data-gh-spotlight-card
        data-kind={kind}
        sx={[
          theme => {
            const radius = `${theme.shape.customBorderRadius.display}px`
            const isBrand = kind === 'nexaBrand'
            const widthValue = resolveCssSize(width) ?? (sizeConfig ? `${sizeConfig.width}px` : undefined)
            const heightValue = resolveCssSize(height) ?? (sizeConfig ? `${sizeConfig.height}px` : undefined)
            const dynamicHue = `calc(${kindConfig.base} + (var(--gh-spotlight-xp, 0) * ${kindConfig.spread}))`
            const baseSpotlight = `hsl(${dynamicHue} calc(var(--gh-spotlight-saturation, 100) * 1%) calc(var(--gh-spotlight-lightness, 70) * 1%) / var(--gh-spotlight-bg-opacity, 0.1))`
            const borderSpotlight = `hsl(${dynamicHue} calc(var(--gh-spotlight-saturation, 100) * 1%) calc(var(--gh-spotlight-border-lightness, 50) * 1%) / var(--gh-spotlight-border-opacity, 1))`
            const orbSpotlight = `hsl(${dynamicHue} calc(var(--gh-spotlight-saturation, 100) * 1%) calc(var(--gh-spotlight-orb-lightness, 58) * 1%) / var(--gh-spotlight-orb-alpha, 0.18))`
            const brandBase = alpha(GREENHOUSE_NEXA_BRAND_COLORS.coreBlue, 0.3)
            const brandBorder = alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.94)
            const brandLight = alpha(theme.palette.common.white, 0.92)
            const brandOrb = alpha(GREENHOUSE_NEXA_BRAND_COLORS.coreBlue, 0.5)
            const backdrop = isBrand ? alpha(GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy, 0.92) : alpha(theme.palette.text.primary, 0.12)

            return {
              '--gh-spotlight-base': kindConfig.base,
              '--gh-spotlight-spread': kindConfig.spread,
              '--gh-spotlight-border-size': '3px',
              '--gh-spotlight-size': '200px',
              '--gh-spotlight-orb-size': isBrand ? '220px' : '180px',
              '--gh-spotlight-outer-opacity': 1,
              '--gh-spotlight-orb-opacity': isBrand ? 0.78 : 0.42,
              '--gh-spotlight-bg-color': isBrand ? brandBase : baseSpotlight,
              '--gh-spotlight-border-color': isBrand ? brandBorder : borderSpotlight,
              '--gh-spotlight-light-color': isBrand ? brandLight : 'hsl(0 100% 100% / var(--gh-spotlight-light-opacity, 1))',
              '--gh-spotlight-orb-color': isBrand ? brandOrb : orbSpotlight,
              position: 'relative',
              display: 'grid',
              gridTemplateRows: '1fr auto',
              gap: 4,
              inlineSize: widthValue,
              blockSize: heightValue,
              maxInlineSize: '100%',
              minInlineSize: size === 'custom' ? 0 : undefined,
              minBlockSize: size === 'custom' ? undefined : 220,
              p: 4,
              overflow: 'hidden',
              isolation: 'isolate',
              touchAction: 'none',
              border: 'var(--gh-spotlight-border-size) solid transparent',
              borderRadius: radius,
              color: isBrand ? theme.palette.common.white : 'text.primary',
              bgcolor: backdrop,
              backgroundColor: backdrop,
              backgroundImage:
                'radial-gradient(var(--gh-spotlight-size) var(--gh-spotlight-size) at calc(var(--gh-spotlight-x, 0) * 1px) calc(var(--gh-spotlight-y, 0) * 1px), var(--gh-spotlight-bg-color), transparent)',
              backgroundSize: 'calc(100% + (2 * var(--gh-spotlight-border-size))) calc(100% + (2 * var(--gh-spotlight-border-size)))',
              backgroundPosition: '50% 50%',
              backgroundAttachment: 'scroll',
              backdropFilter: 'blur(5px)',
              boxShadow: `0 1rem 2rem -1rem ${alpha(theme.palette.common.black, 0.72)}`,
              '&:hover, &:focus-within': {
                '--gh-spotlight-orb-opacity': isBrand ? 0.92 : 0.56
              },
              '&:hover [data-gh-spotlight-content], &:focus-within [data-gh-spotlight-content]': {
                transform: 'translateY(-2px)'
              },
              '@media (prefers-reduced-motion: reduce)': {
                backgroundAttachment: 'scroll',
                '& [data-gh-spotlight-content]': {
                  transition: 'none'
                },
                '&:hover [data-gh-spotlight-content], &:focus-within [data-gh-spotlight-content]': {
                  transform: 'none'
                }
              }
            }
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
        ]}
      >
        <Box aria-hidden data-gh-spotlight-aura />
        <Box aria-hidden data-gh-spotlight-orb />
        <Box
          data-gh-spotlight-content
          sx={[
            {
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              minBlockSize: 0,
              transition: 'transform 220ms ease'
            },
            ...(Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : [])
          ]}
        >
          {children}
        </Box>
      </Box>
    </>
  )
}

export default GreenhouseSpotlightCard
