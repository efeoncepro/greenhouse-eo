import type {
  NexaExpressionCueContext,
  NexaExpressionCueKey,
  NexaExpressionCueRegistryItem,
  NexaExpressionCueSensitiveDomain,
  NexaExpressionCueTreatment
} from './nexa-expression-cue-types'

export const NEXA_EXPRESSION_CUE_KEYS = [
  'ready',
  'reviewing',
  'risk',
  'idea',
  'source',
  'next_step',
  'opportunity',
  'missing_context',
  'blocked',
  'sensitive'
] as const satisfies readonly NexaExpressionCueKey[]

export const NEXA_EXPRESSION_CUE_CONTEXTS = [
  'chatText',
  'answerSurface',
  'stateChip',
  'emptyState',
  'promptDock'
] as const satisfies readonly NexaExpressionCueContext[]

export const NEXA_EXPRESSION_CUE_TREATMENTS = [
  'nexaMark',
  'fluentAsset',
  'tablerIcon',
  'statusDot',
  'textOnly',
  'none'
] as const satisfies readonly NexaExpressionCueTreatment[]

export const NEXA_EXPRESSION_SENSITIVE_DOMAINS = [
  'finance',
  'payroll',
  'legal',
  'security',
  'contractual'
] as const satisfies readonly NexaExpressionCueSensitiveDomain[]

const allContexts = NEXA_EXPRESSION_CUE_CONTEXTS

export const NEXA_EXPRESSION_CUE_REGISTRY: Record<NexaExpressionCueKey, NexaExpressionCueRegistryItem> = {
  ready: {
    key: 'ready',
    label: 'Listo',
    ariaLabel: 'Respuesta lista',
    tone: 'success',
    visualPriority: 'medium',
    allowedContexts: allContexts,
    defaultTreatment: 'fluentAsset',
    treatmentByContext: { stateChip: 'statusDot', promptDock: 'statusDot' },
    sensitiveTreatment: 'tablerIcon',
    tablerIconClassName: 'tabler-circle-check',
    assetSrc: '/images/nexa-expression-cues/fluent-check-mark-flat.svg'
  },
  reviewing: {
    key: 'reviewing',
    label: 'Revisando',
    ariaLabel: 'Nexa está revisando',
    sensitiveLabel: 'Revisión en curso',
    sensitiveAriaLabel: 'Revisión en curso',
    tone: 'nexa',
    visualPriority: 'medium',
    allowedContexts: allContexts,
    defaultTreatment: 'nexaMark',
    treatmentByContext: { stateChip: 'statusDot' },
    sensitiveTreatment: 'textOnly',
    tablerIconClassName: 'tabler-search',
    soberIconClassName: 'tabler-loader-2'
  },
  risk: {
    key: 'risk',
    label: 'Riesgo',
    ariaLabel: 'Riesgo detectado',
    tone: 'warning',
    visualPriority: 'high',
    allowedContexts: allContexts,
    defaultTreatment: 'tablerIcon',
    treatmentByContext: { stateChip: 'statusDot' },
    sensitiveTreatment: 'tablerIcon',
    tablerIconClassName: 'tabler-alert-triangle'
  },
  idea: {
    key: 'idea',
    label: 'Idea',
    ariaLabel: 'Idea de Nexa',
    sensitiveLabel: 'Punto a evaluar',
    sensitiveAriaLabel: 'Punto a evaluar con cuidado',
    tone: 'creative',
    visualPriority: 'medium',
    allowedContexts: allContexts,
    defaultTreatment: 'fluentAsset',
    treatmentByContext: { stateChip: 'textOnly' },
    sensitiveTreatment: 'textOnly',
    tablerIconClassName: 'tabler-bulb',
    assetSrc: '/images/nexa-expression-cues/fluent-light-bulb-flat.svg'
  },
  source: {
    key: 'source',
    label: 'Fuente',
    ariaLabel: 'Fuente o evidencia',
    tone: 'info',
    visualPriority: 'low',
    allowedContexts: allContexts,
    defaultTreatment: 'fluentAsset',
    treatmentByContext: { stateChip: 'statusDot' },
    sensitiveTreatment: 'tablerIcon',
    tablerIconClassName: 'tabler-file-text',
    soberIconClassName: 'tabler-file-description',
    assetSrc: '/images/nexa-expression-cues/fluent-memo-flat.svg'
  },
  next_step: {
    key: 'next_step',
    label: 'Siguiente paso',
    ariaLabel: 'Siguiente paso sugerido',
    tone: 'nexa',
    visualPriority: 'medium',
    allowedContexts: allContexts,
    defaultTreatment: 'fluentAsset',
    treatmentByContext: { stateChip: 'statusDot' },
    sensitiveTreatment: 'textOnly',
    tablerIconClassName: 'tabler-arrow-right',
    assetSrc: '/images/nexa-expression-cues/fluent-compass-flat.svg'
  },
  opportunity: {
    key: 'opportunity',
    label: 'Oportunidad',
    ariaLabel: 'Oportunidad detectada',
    sensitiveLabel: 'Oportunidad por validar',
    sensitiveAriaLabel: 'Oportunidad por validar',
    tone: 'nexa',
    visualPriority: 'medium',
    allowedContexts: allContexts,
    defaultTreatment: 'nexaMark',
    treatmentByContext: { stateChip: 'textOnly' },
    sensitiveTreatment: 'textOnly',
    tablerIconClassName: 'tabler-sparkles'
  },
  missing_context: {
    key: 'missing_context',
    label: 'Falta contexto',
    ariaLabel: 'Falta contexto',
    tone: 'warning',
    visualPriority: 'medium',
    allowedContexts: allContexts,
    defaultTreatment: 'fluentAsset',
    treatmentByContext: { stateChip: 'statusDot' },
    sensitiveTreatment: 'textOnly',
    tablerIconClassName: 'tabler-puzzle',
    assetSrc: '/images/nexa-expression-cues/fluent-puzzle-piece-flat.svg'
  },
  blocked: {
    key: 'blocked',
    label: 'Bloqueado',
    ariaLabel: 'Flujo bloqueado',
    tone: 'error',
    visualPriority: 'high',
    allowedContexts: allContexts,
    defaultTreatment: 'tablerIcon',
    treatmentByContext: { stateChip: 'statusDot' },
    sensitiveTreatment: 'tablerIcon',
    tablerIconClassName: 'tabler-lock'
  },
  sensitive: {
    key: 'sensitive',
    label: 'Tema sensible',
    ariaLabel: 'Tema sensible',
    tone: 'neutral',
    visualPriority: 'high',
    allowedContexts: allContexts,
    defaultTreatment: 'textOnly',
    treatmentByContext: { chatText: 'none', answerSurface: 'none', promptDock: 'none' },
    sensitiveTreatment: 'textOnly',
    tablerIconClassName: 'tabler-shield-lock'
  }
}
