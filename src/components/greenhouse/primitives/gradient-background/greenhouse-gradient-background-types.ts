import type { ReactNode } from 'react'

import type { SxProps, Theme } from '@mui/material/styles'

export type GreenhouseGradientBackgroundVariant = 'surfaceWash' | 'heroAurora' | 'brandField'

export type GreenhouseGradientBackgroundKind =
  | 'axisSurface'
  | 'nexaAurora'
  | 'efeonceBrand'
  | 'insightPanel'
  | 'calmBackdrop'
  | 'custom'

export type GreenhouseGradientBackgroundIntensity = 'subtle' | 'medium' | 'strong'

export interface GreenhouseGradientBackgroundConfig {
  variant: GreenhouseGradientBackgroundVariant
  accentLayers: string[]
  linearLayer: string
  foreground: 'default' | 'inverted'
  overlayOpacity: number
}

export interface GreenhouseGradientBackgroundProps {
  children?: ReactNode
  variant?: GreenhouseGradientBackgroundVariant
  kind?: GreenhouseGradientBackgroundKind
  intensity?: GreenhouseGradientBackgroundIntensity
  animated?: boolean
  overlay?: boolean
  overlayOpacity?: number
  centerContent?: boolean
  minBlockSize?: number | string
  dataCapture?: string
  sx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
}
