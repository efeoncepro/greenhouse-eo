import type { NexaProvenanceTraceKind, NexaProvenanceTraceVariant } from './nexa-provenance-trace-types'

export interface NexaProvenanceTraceKindConfig {
  kind: NexaProvenanceTraceKind
  /** Variant por defecto del kind cuando el consumer no pasa uno explícito. */
  defaultVariant: NexaProvenanceTraceVariant
}

/**
 * Mapa kind→variant. Idempotente; el kind es semántico (dominio/workflow), el variant es funcional.
 * Cualquier kind nuevo se agrega acá resolviendo a un variant EXISTENTE (no se inventan variants por
 * dominio — misma regla transversal que el canvas).
 */
export const NEXA_PROVENANCE_TRACE_KIND_CONFIG = {
  knowledgeGrounded: { kind: 'knowledgeGrounded', defaultVariant: 'panel' },
  signalPromoted: { kind: 'signalPromoted', defaultVariant: 'inline' },
  computed: { kind: 'computed', defaultVariant: 'inline' },
  custom: { kind: 'custom', defaultVariant: 'inline' }
} as const satisfies Record<NexaProvenanceTraceKind, NexaProvenanceTraceKindConfig>

export const resolveNexaProvenanceTraceVariant = ({
  kind,
  variant
}: {
  kind?: NexaProvenanceTraceKind
  variant?: NexaProvenanceTraceVariant
}): NexaProvenanceTraceVariant => variant ?? NEXA_PROVENANCE_TRACE_KIND_CONFIG[kind ?? 'custom'].defaultVariant
