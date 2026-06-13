import { alpha, type Theme } from '@mui/material/styles'

import type { AxisRampStep } from '@core/theme/axis-tokens'

import type {
  GreenhouseGradientBackgroundConfig,
  GreenhouseGradientBackgroundIntensity,
  GreenhouseGradientBackgroundKind,
  GreenhouseGradientBackgroundVariant
} from './greenhouse-gradient-background-types'

const INTENSITY_MULTIPLIER: Record<GreenhouseGradientBackgroundIntensity, number> = {
  subtle: 0.72,
  medium: 1,
  strong: 1.34
}

const clampAlpha = (value: number) => Math.min(Math.max(value, 0), 0.92)

const tone = (theme: Theme, value: string, opacity: number, intensity: GreenhouseGradientBackgroundIntensity) =>
  alpha(value, clampAlpha(opacity * INTENSITY_MULTIPLIER[intensity]))

const axisPrimary = (theme: Theme, step: AxisRampStep) => theme.axis.ramp.primary[step]
const axisSecondary = (theme: Theme, step: AxisRampStep) => theme.axis.ramp.secondary[step]
const axisInfo = (theme: Theme, step: AxisRampStep) => theme.axis.ramp.info[step]
const axisGray = (theme: Theme, step: AxisRampStep) => theme.axis.ramp.gray[step]

export interface GreenhouseGradientBackgroundKindConfig {
  kind: GreenhouseGradientBackgroundKind
  variant: GreenhouseGradientBackgroundVariant
}

export const GREENHOUSE_GRADIENT_BACKGROUND_KIND_CONFIG: Record<
  GreenhouseGradientBackgroundKind,
  GreenhouseGradientBackgroundKindConfig
> = {
  axisSurface: { kind: 'axisSurface', variant: 'surfaceWash' },
  nexaAurora: { kind: 'nexaAurora', variant: 'heroAurora' },
  efeonceBrand: { kind: 'efeonceBrand', variant: 'brandField' },
  insightPanel: { kind: 'insightPanel', variant: 'heroAurora' },
  calmBackdrop: { kind: 'calmBackdrop', variant: 'surfaceWash' },
  custom: { kind: 'custom', variant: 'surfaceWash' }
}

export const resolveGreenhouseGradientBackgroundKind = (
  kind?: GreenhouseGradientBackgroundKind
): GreenhouseGradientBackgroundKindConfig => GREENHOUSE_GRADIENT_BACKGROUND_KIND_CONFIG[kind ?? 'axisSurface']

export const resolveGreenhouseGradientBackgroundVariant = (
  variant?: GreenhouseGradientBackgroundVariant,
  kind?: GreenhouseGradientBackgroundKind
): GreenhouseGradientBackgroundVariant => variant ?? resolveGreenhouseGradientBackgroundKind(kind).variant

export const buildGreenhouseGradientBackgroundConfig = ({
  theme,
  variant,
  kind,
  intensity = 'medium'
}: {
  theme: Theme
  variant?: GreenhouseGradientBackgroundVariant
  kind?: GreenhouseGradientBackgroundKind
  intensity?: GreenhouseGradientBackgroundIntensity
}): GreenhouseGradientBackgroundConfig => {
  const resolvedKind = kind ?? 'axisSurface'
  const resolvedVariant = resolveGreenhouseGradientBackgroundVariant(variant, resolvedKind)

  if (resolvedKind === 'nexaAurora') {
    return {
      variant: resolvedVariant,
      foreground: 'inverted',
      overlayOpacity: 0.2,
      accentLayers: [
        `linear-gradient(118deg, transparent 0%, ${tone(theme, axisSecondary(theme, 500), 0.42, intensity)} 28%, transparent 62%)`,
        `linear-gradient(244deg, transparent 12%, ${tone(theme, axisInfo(theme, 500), 0.34, intensity)} 46%, transparent 78%)`,
        `linear-gradient(18deg, transparent 18%, ${tone(theme, axisPrimary(theme, 600), 0.36, intensity)} 54%, transparent 88%)`
      ],
      linearLayer: `linear-gradient(135deg, ${axisPrimary(theme, 900)} 0%, ${axisPrimary(theme, 800)} 42%, ${axisInfo(theme, 800)} 100%)`
    }
  }

  if (resolvedKind === 'efeonceBrand') {
    return {
      variant: resolvedVariant,
      foreground: 'inverted',
      overlayOpacity: 0.16,
      accentLayers: [
        `linear-gradient(122deg, transparent 4%, ${tone(theme, axisInfo(theme, 400), 0.36, intensity)} 34%, transparent 66%)`,
        `linear-gradient(238deg, transparent 8%, ${tone(theme, axisSecondary(theme, 500), 0.3, intensity)} 48%, transparent 80%)`,
        `linear-gradient(12deg, transparent 16%, ${tone(theme, axisPrimary(theme, 600), 0.42, intensity)} 58%, transparent 92%)`
      ],
      linearLayer: `linear-gradient(135deg, ${axisPrimary(theme, 900)} 0%, ${axisPrimary(theme, 700)} 48%, ${axisSecondary(theme, 700)} 100%)`
    }
  }

  if (resolvedKind === 'insightPanel') {
    return {
      variant: resolvedVariant,
      foreground: 'default',
      overlayOpacity: 0.08,
      accentLayers: [
        `linear-gradient(118deg, transparent 8%, ${tone(theme, axisInfo(theme, 500), 0.2, intensity)} 36%, transparent 70%)`,
        `linear-gradient(238deg, transparent 12%, ${tone(theme, axisSecondary(theme, 500), 0.2, intensity)} 50%, transparent 84%)`,
        `linear-gradient(8deg, transparent 18%, ${tone(theme, axisPrimary(theme, 500), 0.16, intensity)} 56%, transparent 90%)`
      ],
      linearLayer: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${tone(
        theme,
        axisInfo(theme, 400),
        0.1,
        intensity
      )} 100%)`
    }
  }

  if (resolvedKind === 'calmBackdrop') {
    return {
      variant: resolvedVariant,
      foreground: 'default',
      overlayOpacity: 0.06,
      accentLayers: [
        `linear-gradient(120deg, transparent 4%, ${tone(theme, axisGray(theme, 200), 0.5, intensity)} 38%, transparent 76%)`,
        `linear-gradient(238deg, transparent 10%, ${tone(theme, axisPrimary(theme, 300), 0.14, intensity)} 48%, transparent 82%)`,
        `linear-gradient(4deg, transparent 20%, ${tone(theme, axisSecondary(theme, 400), 0.1, intensity)} 58%, transparent 92%)`
      ],
      linearLayer: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
    }
  }

  return {
    variant: resolvedVariant,
    foreground: 'default',
    overlayOpacity: 0.08,
    accentLayers: [
      `linear-gradient(118deg, transparent 6%, ${tone(theme, axisPrimary(theme, 500), 0.16, intensity)} 34%, transparent 70%)`,
      `linear-gradient(242deg, transparent 12%, ${tone(theme, axisSecondary(theme, 500), 0.16, intensity)} 48%, transparent 82%)`,
      `linear-gradient(10deg, transparent 18%, ${tone(theme, axisInfo(theme, 500), 0.12, intensity)} 56%, transparent 90%)`
    ],
    linearLayer: `linear-gradient(150deg, ${theme.palette.background.paper} 0%, ${tone(
      theme,
      axisGray(theme, 100),
      0.74,
      intensity
    )} 100%)`
  }
}

export const buildGreenhouseGradientBackgroundCss = (config: GreenhouseGradientBackgroundConfig) =>
  [...config.accentLayers, config.linearLayer].join(', ')
