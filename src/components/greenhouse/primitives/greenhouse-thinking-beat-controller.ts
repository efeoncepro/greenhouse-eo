export type GreenhouseThinkingBeatVariant = 'inline' | 'cluster' | 'standalone'
export type GreenhouseThinkingBeatKind = 'nexa' | 'assistant' | 'sync' | 'neutral'

export type GreenhouseThinkingBeatVariantConfig = {
  dotSize: number
  gap: number
  paddingInline: number
  paddingBlock: number
  surface: boolean
}

export type GreenhouseThinkingBeatKindConfig = {
  ariaLabel: string
  colorMode: 'nexa' | 'primary' | 'info' | 'neutral'
}

export const GREENHOUSE_THINKING_BEAT_VARIANT_CONFIG: Record<
  GreenhouseThinkingBeatVariant,
  GreenhouseThinkingBeatVariantConfig
> = {
  inline: {
    dotSize: 4,
    gap: 0.5,
    paddingInline: 0,
    paddingBlock: 0,
    surface: false
  },
  cluster: {
    dotSize: 5,
    gap: 0.75,
    paddingInline: 1,
    paddingBlock: 0.75,
    surface: true
  },
  standalone: {
    dotSize: 6,
    gap: 1,
    paddingInline: 1.5,
    paddingBlock: 1,
    surface: true
  }
}

export const GREENHOUSE_THINKING_BEAT_KIND_CONFIG: Record<
  GreenhouseThinkingBeatKind,
  GreenhouseThinkingBeatKindConfig
> = {
  nexa: {
    ariaLabel: 'Nexa esta pensando',
    colorMode: 'nexa'
  },
  assistant: {
    ariaLabel: 'El asistente esta preparando una respuesta',
    colorMode: 'primary'
  },
  sync: {
    ariaLabel: 'Sincronizacion en curso',
    colorMode: 'info'
  },
  neutral: {
    ariaLabel: 'Procesando',
    colorMode: 'neutral'
  }
}

export const GREENHOUSE_THINKING_BEAT_MOTION = {
  durationMs: 600,
  staggerMs: 150
} as const

export const resolveGreenhouseThinkingBeatVariant = (variant?: GreenhouseThinkingBeatVariant) =>
  GREENHOUSE_THINKING_BEAT_VARIANT_CONFIG[variant ?? 'inline']

export const resolveGreenhouseThinkingBeatKind = (kind?: GreenhouseThinkingBeatKind) =>
  GREENHOUSE_THINKING_BEAT_KIND_CONFIG[kind ?? 'neutral']
