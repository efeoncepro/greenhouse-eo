'use client'

import Box from '@mui/material/Box'
import GlobalStyles from '@mui/material/GlobalStyles'
import { alpha, useTheme } from '@mui/material/styles'

import {
  buildGreenhouseBorderBeamConfig,
  buildGreenhouseBorderBeamGradient
} from './greenhouse-border-beam-controller'
import type { GreenhouseBorderBeamProps } from './greenhouse-border-beam-types'

const borderBeamGlobalStyles = (
  <GlobalStyles
    styles={{
      '@property --greenhouse-border-beam-angle': {
        syntax: "'<angle>'",
        inherits: 'false',
        initialValue: '0deg'
      },
      '@keyframes greenhouse-border-beam-rotate': {
        to: { '--greenhouse-border-beam-angle': '360deg' }
      },
      '@keyframes greenhouse-border-spectrum-pan': {
        '0%': { backgroundPosition: '0% 50%' },
        '50%': { backgroundPosition: '100% 50%' },
        '100%': { backgroundPosition: '0% 50%' }
      }
    }}
  />
)

const GreenhouseBorderBeam = ({
  active = false,
  animated = true,
  beamSize,
  borderWidth,
  children,
  contentSx,
  dataCapture,
  disabled = false,
  durationSec,
  effect,
  intensity = 'medium',
  kind = 'nexaSurface',
  spectrumPalette,
  sx,
  variant
}: GreenhouseBorderBeamProps) => {
  const theme = useTheme()

  const config = buildGreenhouseBorderBeamConfig({
    theme,
    variant,
    kind,
    intensity,
    durationSec,
    beamSize,
    borderWidth,
    effect,
    spectrumPalette
  })

  const gradient = buildGreenhouseBorderBeamGradient(config)
  const resolvedOpacity = disabled ? 0 : active || config.variant !== 'interactive' ? config.restingOpacity : config.restingOpacity * 0.62
  const animationName = config.effect === 'spectrum' ? 'greenhouse-border-spectrum-pan' : 'greenhouse-border-beam-rotate'

  const reducedMotionBackground =
    config.effect === 'spectrum'
      ? `linear-gradient(90deg, ${config.spectrumColors.map(color => alpha(color, 0.72)).join(', ')})`
      : `linear-gradient(90deg, ${alpha(config.colorFrom, 0.48)}, ${alpha(config.colorTo, 0.48)})`

  const beam = (
    <>
      {borderBeamGlobalStyles}
      {config.effect === 'spectrum' ? (
        <Box
          aria-hidden
          data-gh-border-beam-glow
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: -8,
            zIndex: 0,
            borderRadius: 'inherit',
            opacity: disabled ? 0 : config.glowOpacity,
            background: gradient,
            backgroundSize: '400% 400%',
            filter: 'blur(32px)',
            transform: 'translateZ(0)',
            animation: animated && !disabled ? `${animationName} ${config.durationSec}s linear infinite` : 'none',
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              background: reducedMotionBackground,
              filter: 'blur(18px)'
            },
            '@media (forced-colors: active)': {
              display: 'none'
            }
          }}
        />
      ) : null}
      <Box
        aria-hidden
        data-gh-border-beam
        data-capture={dataCapture}
        data-kind={kind}
        data-effect={config.effect}
        data-spectrum-palette={config.spectrumPalette}
        data-variant={config.variant}
        sx={[
          {
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            borderRadius: 'inherit',
            padding: `${config.borderWidth}px`,
            opacity: resolvedOpacity,
            background: gradient,
            backgroundSize: config.effect === 'spectrum' ? '400% 400%' : undefined,
            filter:
              config.effect === 'spectrum'
                ? `drop-shadow(0 0 18px ${alpha(config.colorTo, config.glowOpacity * 0.78)})`
                : `drop-shadow(0 0 ${Math.max(8, config.beamSize * 0.06)}px ${alpha(config.colorTo, config.glowOpacity)})`,
            WebkitMask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            transform: 'translateZ(0)',
            animation: animated && !disabled ? `${animationName} ${config.durationSec}s linear infinite` : 'none',
            transition: 'opacity 180ms ease, filter 180ms ease',
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              background: reducedMotionBackground,
              filter: config.effect === 'spectrum' ? `drop-shadow(0 0 10px ${alpha(config.colorTo, 0.3)})` : 'none'
            },
            '@media (forced-colors: active)': {
              background: 'CanvasText',
              filter: 'none',
              opacity: disabled ? 0 : 1
            }
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
        ]}
      />
    </>
  )

  if (!children) {
    return beam
  }

  return (
    <Box
      data-kind={kind}
      data-effect={config.effect}
      data-spectrum-palette={config.spectrumPalette}
      data-variant={config.variant}
      sx={{
        position: 'relative',
        overflow: config.effect === 'spectrum' ? 'visible' : 'hidden',
        isolation: 'isolate',
        borderRadius: 'inherit',
        '&:hover > [data-gh-border-beam], &:focus-within > [data-gh-border-beam]': {
          opacity: disabled ? 0 : Math.min(1, config.restingOpacity * 1.22)
        }
      }}
    >
      <Box sx={[{ position: 'relative', zIndex: 1 }, ...(Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : [])]}>
        {children}
      </Box>
      {beam}
    </Box>
  )
}

export default GreenhouseBorderBeam
