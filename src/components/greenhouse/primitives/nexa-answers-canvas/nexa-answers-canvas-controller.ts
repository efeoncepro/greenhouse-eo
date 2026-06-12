import type {
  NexaAnswersCanvasDensity,
  NexaAnswersCanvasKind,
  NexaAnswersCanvasVariant,
  NexaAnswersRendererKind,
  NexaAnswersRenderPlan,
  NexaAnswersSurfaceContext
} from './nexa-answers-canvas-types'

export interface NexaAnswersCanvasVariantConfig {
  variant: NexaAnswersCanvasVariant
  defaultDensity: NexaAnswersCanvasDensity
  ownsScroll: boolean
}

export interface NexaAnswersCanvasKindConfig {
  kind: NexaAnswersCanvasKind
  variant: NexaAnswersCanvasVariant
  defaultDensity: NexaAnswersCanvasDensity
}

export const NEXA_ANSWERS_CANVAS_VARIANT_CONFIG = {
  embedded: {
    variant: 'embedded',
    defaultDensity: 'embeddedStandard',
    ownsScroll: false
  },
  sidecar: {
    variant: 'sidecar',
    defaultDensity: 'sidecar',
    ownsScroll: true
  },
  inline: {
    variant: 'inline',
    defaultDensity: 'inlineCompact',
    ownsScroll: false
  }
} as const satisfies Record<NexaAnswersCanvasVariant, NexaAnswersCanvasVariantConfig>

export const NEXA_ANSWERS_CANVAS_KIND_CONFIG = {
  knowledgeEmbedded: {
    kind: 'knowledgeEmbedded',
    variant: 'embedded',
    defaultDensity: 'embeddedStandard'
  },
  financeChartEmbedded: {
    kind: 'financeChartEmbedded',
    variant: 'embedded',
    defaultDensity: 'wideAnalytical'
  },
  agencyInsightEmbedded: {
    kind: 'agencyInsightEmbedded',
    variant: 'embedded',
    defaultDensity: 'embeddedStandard'
  },
  peopleInsightEmbedded: {
    kind: 'peopleInsightEmbedded',
    variant: 'embedded',
    defaultDensity: 'embeddedStandard'
  },
  commercialInsightEmbedded: {
    kind: 'commercialInsightEmbedded',
    variant: 'embedded',
    defaultDensity: 'embeddedStandard'
  },
  custom: {
    kind: 'custom',
    variant: 'embedded',
    defaultDensity: 'embeddedStandard'
  }
} as const satisfies Record<NexaAnswersCanvasKind, NexaAnswersCanvasKindConfig>

export const resolveNexaAnswersCanvasVariant = ({
  kind,
  variant
}: {
  kind?: NexaAnswersCanvasKind
  variant?: NexaAnswersCanvasVariant
}): NexaAnswersCanvasVariant => variant ?? NEXA_ANSWERS_CANVAS_KIND_CONFIG[kind ?? 'custom'].variant

export const resolveNexaAnswersCanvasDensity = ({
  density,
  kind,
  surfaceContext,
  variant
}: {
  density?: NexaAnswersCanvasDensity
  kind?: NexaAnswersCanvasKind
  surfaceContext?: NexaAnswersSurfaceContext
  variant: NexaAnswersCanvasVariant
}): NexaAnswersCanvasDensity =>
  density ??
  surfaceContext?.density ??
  NEXA_ANSWERS_CANVAS_KIND_CONFIG[kind ?? 'custom'].defaultDensity ??
  NEXA_ANSWERS_CANVAS_VARIANT_CONFIG[variant].defaultDensity

export const assertNexaAnswersRenderPlanAllowed = ({
  renderPlan,
  allowedRenderers
}: {
  renderPlan?: NexaAnswersRenderPlan
  allowedRenderers: NexaAnswersRendererKind[]
}) => {
  if (!renderPlan) return

  const allowed = new Set(allowedRenderers)
  const invalid = renderPlan.blocks.find(block => !allowed.has(block.renderer))

  if (invalid) {
    throw new Error(`NexaAnswersCanvas renderer "${invalid.renderer}" is not allowed for this surface`)
  }
}
