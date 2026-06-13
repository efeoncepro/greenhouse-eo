import type { ReactNode } from 'react'

import type { SxProps, Theme } from '@mui/material/styles'

export type GreenhouseBorderBeamVariant = 'ambient' | 'interactive' | 'progress'

export type GreenhouseBorderBeamEffect = 'beam' | 'spectrum'

export type GreenhouseBorderBeamSpectrumPalette = 'axis' | 'nexa'

export type GreenhouseBorderBeamKind =
  | 'nexaSurface'
  | 'promptDock'
  | 'evidencePeek'
  | 'approvalCard'
  | 'asyncOperation'
  | 'custom'

export type GreenhouseBorderBeamIntensity = 'subtle' | 'medium' | 'strong'

export interface GreenhouseBorderBeamConfig {
  variant: GreenhouseBorderBeamVariant
  effect: GreenhouseBorderBeamEffect
  spectrumPalette: GreenhouseBorderBeamSpectrumPalette
  colorFrom: string
  colorTo: string
  spectrumColors: string[]
  durationSec: number
  beamSize: number
  borderWidth: number
  glowOpacity: number
  restingOpacity: number
}

export interface GreenhouseBorderBeamProps {
  children?: ReactNode
  variant?: GreenhouseBorderBeamVariant
  kind?: GreenhouseBorderBeamKind
  intensity?: GreenhouseBorderBeamIntensity
  active?: boolean
  animated?: boolean
  disabled?: boolean
  durationSec?: number
  beamSize?: number
  borderWidth?: number
  effect?: GreenhouseBorderBeamEffect
  spectrumPalette?: GreenhouseBorderBeamSpectrumPalette
  dataCapture?: string
  contentSx?: SxProps<Theme>
  sx?: SxProps<Theme>
}
