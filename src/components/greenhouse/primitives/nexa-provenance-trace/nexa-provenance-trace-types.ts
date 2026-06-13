import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

import type { NexaExpressiveTextValue } from '../nexa-expressive-text/nexa-expressive-text-types'

/**
 * NexaProvenanceTrace — primitiva canónica del GROUNDING de Nexa (TASK-1103, SoT del "por qué confiar").
 *
 * Unifica las piezas hoy dispersas que comunican procedencia: trust cue compacto (`inline`), traza de
 * razonamiento progresiva (`expandable`) y panel de evidencia bajo demanda (`panel`). Transversal: la
 * consumen Knowledge (primer consumer), Finance, Agency, Personas, Commercial y el answer-trace — vía el
 * mismo contrato. Primitive + Variants + Kinds: el `kind` semántico resuelve a un `variant` funcional.
 */
export type NexaProvenanceTraceVariant = 'inline' | 'expandable' | 'panel'

/**
 * Kind semántico de dominio/workflow → resuelve a un variant (controller). NO cambia layout por dominio:
 * `knowledgeGrounded` (citas + fuentes), `signalPromoted` (señal ICO/finance promovida), `computed`
 * (derivado de readers, sin fuente externa).
 */
export type NexaProvenanceTraceKind = 'knowledgeGrounded' | 'signalPromoted' | 'computed' | 'custom'

/** Tono semántico del grounding — éxito (fuentes actuales) / warning (parcial) / info (promovido). */
export type NexaProvenanceTone = 'success' | 'warning' | 'info'

/** Trust cue compacto (variant `inline`): una línea que asienta la confianza sin robar protagonismo. */
export interface NexaProvenanceTrustCue {
  tone: NexaProvenanceTone
  label: NexaExpressiveTextValue
  detail?: NexaExpressiveTextValue
}

/** Paso de la traza de razonamiento (variant `expandable`) — done ✓ / active (beat) / pending. */
export interface NexaProvenanceStep {
  id: string
  label: string
  status: 'done' | 'active' | 'pending'
}

export interface NexaProvenanceTraceProps {
  variant?: NexaProvenanceTraceVariant
  kind?: NexaProvenanceTraceKind
  /** `inline`: el trust cue. */
  trustCue?: NexaProvenanceTrustCue
  /** `expandable`: los pasos del razonamiento. */
  steps?: NexaProvenanceStep[]
  /** `expandable`: muestra el shimmer del footprint donde aterrizará la respuesta (default false). */
  showFootprint?: boolean
  /** `panel`: el paquete de evidencia (se compone con NexaEvidencePanel, read-only). */
  evidence?: ConversationalEvidencePacket
  /** `panel`: id del contenedor (para `aria-controls` del toggle que lo abre). */
  panelId?: string
  /** `panel`: abierto/colapsado (default true cuando se renderiza el panel). */
  open?: boolean
}
