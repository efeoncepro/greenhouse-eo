/**
 * greenhouse-funnel-chart-controller — single source of truth for the funnel
 * chart primitive chrome. Domain readers own counts, SLA and diagnostics; this
 * controller owns variant/kind mapping plus reusable rail geometry.
 */

export const GREENHOUSE_FUNNEL_CHART_VARIANTS = [
  'operationalPipeline',
  'conversionPipeline',
  'lifecyclePipeline'
] as const

export type GreenhouseFunnelChartVariant = (typeof GREENHOUSE_FUNNEL_CHART_VARIANTS)[number]

export type GreenhouseFunnelChartKind =
  | 'cscPipeline'
  | 'commercialLifecycle'
  | 'quoteToCash'
  | 'onboardingActivation'
  | 'custom'

export const GREENHOUSE_FUNNEL_STAGE_ROLES = [
  'intake',
  'production',
  'quality',
  'rework',
  'delivery',
  'activation',
  'custom'
] as const

export type GreenhouseFunnelStageRole = (typeof GREENHOUSE_FUNNEL_STAGE_ROLES)[number]

export const GREENHOUSE_FUNNEL_STAGE_ROLE_LABELS = {
  intake: 'Entrada',
  production: 'Producción',
  quality: 'Control',
  rework: 'Retrabajo',
  delivery: 'Entrega',
  activation: 'Activación',
  custom: 'Etapa'
} as const satisfies Record<GreenhouseFunnelStageRole, string>

export const GREENHOUSE_FUNNEL_STAGE_ROLE_SEQUENCE = [
  'intake',
  'production',
  'quality',
  'rework',
  'delivery'
] as const satisfies readonly GreenhouseFunnelStageRole[]

export const GREENHOUSE_FUNNEL_CHART_KIND_DEFAULT_VARIANT = {
  cscPipeline: 'operationalPipeline',
  commercialLifecycle: 'lifecyclePipeline',
  quoteToCash: 'conversionPipeline',
  onboardingActivation: 'lifecyclePipeline',
  custom: 'operationalPipeline'
} as const satisfies Record<GreenhouseFunnelChartKind, GreenhouseFunnelChartVariant>

export const GREENHOUSE_FUNNEL_CHART_ZONE_PRIMITIVES = [
  'GreenhouseFunnelHeaderControls',
  'GreenhouseFunnelKpiStrip',
  'GreenhouseFunnelStageRail',
  'GreenhouseFunnelStageSegment',
  'GreenhouseFunnelDiagnosticsGrid',
  'GreenhouseNexaGreeting kind=funnelStageAdvisor'
] as const

export const resolveGreenhouseFunnelChartVariant = (input: {
  variant?: GreenhouseFunnelChartVariant
  kind?: GreenhouseFunnelChartKind
}): GreenhouseFunnelChartVariant =>
  input.variant ?? GREENHOUSE_FUNNEL_CHART_KIND_DEFAULT_VARIANT[input.kind ?? 'custom']

export const GREENHOUSE_FUNNEL_CHART_TOKENS = Object.freeze({
  card: {
    maxInlineSize: 1180
  },
  rail: {
    minInlineSize: 780,
    stageMinInlineSize: 156,
    stageBlockSize: {
      compact: 210,
      comfortable: 236
    },
    chevronDepth: 30,
    cornerRadius: 3.5,
    overlap: 0
  },
  icon: {
    bubble: 44,
    glyph: 24,
    metricBubble: 54
  },
  diagnostics: {
    labelColumn: {
      compact: 132,
      comfortable: 180
    },
    rowMinBlockSize: 58,
    summaryMinBlockSize: 74
  },
  motion: {
    stageDelayMs: 35,
    stageDurationMs: 280
  },
  opacity: {
    border: 0.72,
    stageSurface: {
      light: 0.08,
      dark: 0.18
    },
    stageHoverSurface: {
      light: 0.13,
      dark: 0.24
    },
    metricSurface: {
      light: 0.1,
      dark: 0.2
    }
  }
} as const)
