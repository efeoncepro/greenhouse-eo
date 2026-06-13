import type {
  NexaMomentCompositionKind,
  NexaMomentCompositionVariant,
  NexaMomentCompositionVariantConfig
} from './nexa-moment-composition-types'

/**
 * Controller del NexaMomentComposition — resuelve kind→variant y la config de layout por variant.
 * Idempotente y puro (testeable sin DOM). NUNCA un variant nuevo por dominio: un kind de dominio resuelve
 * a un variant funcional existente.
 */

export const NEXA_MOMENT_COMPOSITION_VARIANT_CONFIG: Record<
  NexaMomentCompositionVariant,
  NexaMomentCompositionVariantConfig
> = {
  leadOverlay: { variant: 'leadOverlay', layout: 'stack', condensesHost: true },
  anchoredAside: { variant: 'anchoredAside', layout: 'split', condensesHost: false },
  inlineExpand: { variant: 'inlineExpand', layout: 'stack', condensesHost: false }
}

const KIND_TO_VARIANT: Record<NexaMomentCompositionKind, NexaMomentCompositionVariant> = {
  knowledgeOverview: 'leadOverlay',
  financeMetricExplain: 'anchoredAside',
  agencyAccountBrief: 'anchoredAside',
  listAssist: 'inlineExpand',
  custom: 'leadOverlay'
}

/**
 * Resuelve el variant efectivo. Precedencia: `variant` explícito > resolución del `kind` > default
 * `leadOverlay`. Espeja el patrón de los demás controllers (canvas, floating surface).
 */
export const resolveNexaMomentCompositionVariant = (input?: {
  variant?: NexaMomentCompositionVariant
  kind?: NexaMomentCompositionKind
}): NexaMomentCompositionVariant => {
  if (input?.variant) return input.variant
  if (input?.kind) return KIND_TO_VARIANT[input.kind]

  return 'leadOverlay'
}

export const resolveNexaMomentCompositionConfig = (input?: {
  variant?: NexaMomentCompositionVariant
  kind?: NexaMomentCompositionKind
}): NexaMomentCompositionVariantConfig =>
  NEXA_MOMENT_COMPOSITION_VARIANT_CONFIG[resolveNexaMomentCompositionVariant(input)]
