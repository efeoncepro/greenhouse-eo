import { alpha, type Theme } from '@mui/material/styles'

import { GREENHOUSE_NEXA_BRAND_COLORS } from '../greenhouse-nexa-brand-controller'
import type {
  GreenhouseBorderBeamConfig,
  GreenhouseBorderBeamEffect,
  GreenhouseBorderBeamIntensity,
  GreenhouseBorderBeamKind,
  GreenhouseBorderBeamSpectrumPalette,
  GreenhouseBorderBeamVariant
} from './greenhouse-border-beam-types'

export interface GreenhouseBorderBeamKindConfig {
  kind: GreenhouseBorderBeamKind
  variant: GreenhouseBorderBeamVariant
}

export const GREENHOUSE_BORDER_BEAM_KIND_CONFIG: Record<GreenhouseBorderBeamKind, GreenhouseBorderBeamKindConfig> = {
  nexaSurface: { kind: 'nexaSurface', variant: 'ambient' },
  promptDock: { kind: 'promptDock', variant: 'interactive' },
  evidencePeek: { kind: 'evidencePeek', variant: 'interactive' },
  approvalCard: { kind: 'approvalCard', variant: 'ambient' },
  asyncOperation: { kind: 'asyncOperation', variant: 'progress' },
  custom: { kind: 'custom', variant: 'ambient' }
}

const INTENSITY_MULTIPLIER: Record<GreenhouseBorderBeamIntensity, number> = {
  subtle: 0.72,
  medium: 1,
  strong: 1.26
}

const clampOpacity = (value: number) => Math.min(Math.max(value, 0), 1)

export const resolveGreenhouseBorderBeamKind = (kind?: GreenhouseBorderBeamKind): GreenhouseBorderBeamKindConfig =>
  GREENHOUSE_BORDER_BEAM_KIND_CONFIG[kind ?? 'nexaSurface']

export const resolveGreenhouseBorderBeamVariant = (
  variant?: GreenhouseBorderBeamVariant,
  kind?: GreenhouseBorderBeamKind
): GreenhouseBorderBeamVariant => variant ?? resolveGreenhouseBorderBeamKind(kind).variant

export const buildGreenhouseBorderBeamConfig = ({
  theme,
  variant,
  kind,
  intensity = 'medium',
  durationSec,
  beamSize,
  borderWidth,
  effect = 'beam',
  spectrumPalette = 'axis'
}: {
  theme: Theme
  variant?: GreenhouseBorderBeamVariant
  kind?: GreenhouseBorderBeamKind
  intensity?: GreenhouseBorderBeamIntensity
  durationSec?: number
  beamSize?: number
  borderWidth?: number
  effect?: GreenhouseBorderBeamEffect
  spectrumPalette?: GreenhouseBorderBeamSpectrumPalette
}): GreenhouseBorderBeamConfig => {
  const resolvedKind = kind ?? 'nexaSurface'
  const resolvedVariant = resolveGreenhouseBorderBeamVariant(variant, resolvedKind)
  const multiplier = INTENSITY_MULTIPLIER[intensity]

  const spectrumColors =
    spectrumPalette === 'nexa'
      ? [
          GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
          GREENHOUSE_NEXA_BRAND_COLORS.coreBlue,
          GREENHOUSE_NEXA_BRAND_COLORS.electricTeal,
          theme.palette.common.white,
          GREENHOUSE_NEXA_BRAND_COLORS.electricTeal,
          GREENHOUSE_NEXA_BRAND_COLORS.coreBlue
        ]
      : [
          theme.axis.ramp.primary[500],
          theme.axis.ramp.info[500],
          theme.axis.ramp.secondary[500],
          theme.palette.warning.main,
          theme.palette.error.main
        ]

  const base = {
    variant: resolvedVariant,
    effect,
    spectrumPalette,
    durationSec:
      durationSec ?? (effect === 'spectrum' ? 14 : resolvedVariant === 'progress' ? 3.6 : resolvedVariant === 'interactive' ? 5.2 : 7.4),
    beamSize: beamSize ?? (resolvedVariant === 'progress' ? 150 : resolvedVariant === 'interactive' ? 190 : 230),
    borderWidth: borderWidth ?? (effect === 'spectrum' ? 2 : resolvedVariant === 'progress' ? 2 : 1.5),
    glowOpacity: clampOpacity(
      (effect === 'spectrum' ? 0.62 : resolvedVariant === 'progress' ? 0.48 : resolvedVariant === 'interactive' ? 0.34 : 0.28) *
        multiplier
    ),
    restingOpacity: clampOpacity((effect === 'spectrum' ? 1 : resolvedVariant === 'interactive' ? 0.18 : 0.72) * multiplier),
    spectrumColors
  }

  if (resolvedKind === 'promptDock') {
    return {
      ...base,
      colorFrom: theme.axis.ramp.secondary[500],
      colorTo: theme.axis.ramp.info[500],
      glowOpacity: clampOpacity(base.glowOpacity * 1.18)
    }
  }

  if (resolvedKind === 'evidencePeek') {
    return {
      ...base,
      colorFrom: theme.axis.ramp.info[500],
      colorTo: theme.axis.ramp.primary[500]
    }
  }

  if (resolvedKind === 'approvalCard') {
    return {
      ...base,
      colorFrom: theme.palette.success.main,
      colorTo: theme.axis.ramp.primary[500],
      restingOpacity: clampOpacity(base.restingOpacity * 0.82)
    }
  }

  if (resolvedKind === 'asyncOperation') {
    return {
      ...base,
      colorFrom: theme.axis.ramp.primary[500],
      colorTo: theme.axis.ramp.secondary[500],
      glowOpacity: clampOpacity(base.glowOpacity * 1.28)
    }
  }

  return {
    ...base,
    colorFrom: theme.axis.ramp.secondary[500],
    colorTo: theme.axis.ramp.primary[500]
  }
}

export const buildGreenhouseBorderBeamGradient = (config: GreenhouseBorderBeamConfig) => {
  if (config.effect === 'spectrum') {
    const colors = [...config.spectrumColors, ...config.spectrumColors, config.spectrumColors[0]]

    return `linear-gradient(90deg, ${colors.join(', ')})`
  }

  const beamStart = Math.max(8, Math.round(config.beamSize * 0.12))
  const beamPeak = Math.max(18, Math.round(config.beamSize * 0.24))
  const beamEnd = Math.max(42, Math.round(config.beamSize * 0.42))

  return `conic-gradient(from var(--greenhouse-border-beam-angle),
    transparent 0deg,
    transparent ${beamStart}deg,
    ${alpha(config.colorFrom, 0.12)} ${Math.max(beamStart + 8, 24)}deg,
    ${alpha(config.colorFrom, 0.82)} ${beamPeak}deg,
    ${alpha(config.colorTo, 0.92)} ${Math.max(beamPeak + 24, 58)}deg,
    ${alpha(config.colorTo, 0.08)} ${beamEnd}deg,
    transparent ${Math.min(beamEnd + 28, 348)}deg,
    transparent 360deg)`
}
