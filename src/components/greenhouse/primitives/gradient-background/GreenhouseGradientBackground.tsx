'use client'

import Box from '@mui/material/Box'
import { alpha, useTheme } from '@mui/material/styles'

import {
  buildGreenhouseGradientBackgroundConfig,
  buildGreenhouseGradientBackgroundCss
} from './greenhouse-gradient-background-controller'
import type { GreenhouseGradientBackgroundProps } from './greenhouse-gradient-background-types'

const GreenhouseGradientBackground = ({
  animated = true,
  centerContent = false,
  children,
  contentSx,
  dataCapture,
  intensity = 'medium',
  kind = 'axisSurface',
  minBlockSize = 280,
  overlay = false,
  overlayOpacity,
  sx,
  variant
}: GreenhouseGradientBackgroundProps) => {
  const theme = useTheme()
  const config = buildGreenhouseGradientBackgroundConfig({ theme, variant, kind, intensity })
  const backgroundImage = buildGreenhouseGradientBackgroundCss(config)
  const resolvedOverlayOpacity = overlayOpacity ?? config.overlayOpacity

  return (
    <Box
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={config.variant}
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          minBlockSize,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          border: `1px solid ${alpha(config.foreground === 'inverted' ? theme.palette.common.white : theme.palette.text.primary, 0.16)}`,
          backgroundColor: config.foreground === 'inverted' ? theme.axis.ramp.primary[900] : theme.palette.background.paper,
          backgroundImage,
          backgroundBlendMode: config.foreground === 'inverted' ? 'screen, screen, screen, normal' : 'multiply, multiply, multiply, normal',
          backgroundSize: animated ? '180% 180%' : '100% 100%',
          backgroundPosition: animated ? '0% 50%' : '50% 50%',
          color: config.foreground === 'inverted' ? 'common.white' : 'text.primary',
          '@keyframes greenhouse-gradient-background-pan': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' }
          },
          animation: animated ? 'greenhouse-gradient-background-pan 8s ease-in-out infinite' : 'none',
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            backgroundPosition: '50% 50%'
          },
          '@media (forced-colors: active)': {
            backgroundImage: 'none',
            borderColor: 'CanvasText'
          },
          '&::after': overlay
            ? {
                content: '""',
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundColor: config.foreground === 'inverted' ? theme.palette.common.black : theme.palette.background.paper,
                opacity: resolvedOverlayOpacity,
                pointerEvents: 'none'
              }
            : undefined
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      {children ? (
        <Box
          sx={[
            {
              position: 'relative',
              zIndex: 1,
              minBlockSize: 'inherit',
              display: centerContent ? 'grid' : 'block',
              placeItems: centerContent ? 'center' : undefined,
              p: centerContent ? { xs: 5, md: 8 } : undefined
            },
            ...(Array.isArray(contentSx) ? contentSx : contentSx ? [contentSx] : [])
          ]}
        >
          {children}
        </Box>
      ) : null}
    </Box>
  )
}

export default GreenhouseGradientBackground
