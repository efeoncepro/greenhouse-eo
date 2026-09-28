/**
 * Tipos del binding de datos reales en los slots del deck «La órbita» (TASK-1930).
 *
 * `bindDeckSlots(plan, context)` llena los slots de DATOS de un plan (TASK-1929) —logo del cliente, cifras, casos,
 * testimonios, logos de terceros, montos, equipo y datos de muestra— desde la verdad de Greenhouse, y deja en cada slot
 * su rastro. El valor nunca sale del texto de quien propone: sale de un HECHO (el mismo contrato `EvidencedFact` de los
 * chapter-authors, con su `evidenceRef`) que se verifica contra la evidencia canónica de la `Proposal`
 * (`greenhouse_commercial.proposal_evidence`, vía la proyección allowlisted) o, fuera de una `Proposal`, contra un asset
 * existente. Sin dato verificable, el slot queda `unbound` con su motivo y la composición falla cerrada.
 *
 * `proposal_evidence` no guarda el valor de una cifra ni el texto de una cita: guarda de dónde sale (`locator`,
 * `method`), cuándo (`as_of`), su clasificación, su audiencia y el documento que la respalda. Por eso el valor viaja en
 * el hecho y la autorización en la evidencia.
 */

import type { ProposalAudience, ProposalEvidenceClassification } from '@/lib/commercial/tenders/proposals/types'

import type { DeckPlan, DeckPlanIssue } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Hechos que trae el consumer (ya autorizado): el valor de cada slot de datos
// ─────────────────────────────────────────────────────────────────────────────

/** A qué lámina y slot va un hecho. Sin `slideIndex`, a toda lámina de esa receta. */
export interface DeckFactTarget {
  recipeId: string
  slot: string
  slideIndex?: number
}

interface DeckFactBase {
  /** Id estable del hecho (como en los chapter-authors). */
  factId: string
  /**
   * La evidencia que lo respalda. En una `Proposal`: un `evidence_id` de su `proposal_evidence`. Fuera de una
   * `Proposal`: el `asset_id` del documento de respaldo.
   */
  evidenceRef: string
}

/** Una cifra: `value` es el texto exacto de la lámina; `numericValue`, para barras y el arco de medida. */
export interface DeckFigureFact extends DeckFactBase {
  kind: 'figure'
  target: DeckFactTarget
  value: string
  numericValue?: number
  label: string
  /** Fuente visible fuera de una `Proposal` (dentro, la fuente visible es el `locator` de la evidencia). */
  sourceLabel?: string
}

/** Un logo de tercero (cliente del muro, partner o el cliente de un caso). */
export interface DeckLogoFact extends DeckFactBase {
  kind: 'logo'
  target: DeckFactTarget
  name: string
  logoAssetId: string
}

/** Una cita textual con su autor: nombre y cargo o equipo, nada más. */
export interface DeckQuoteFact extends DeckFactBase {
  kind: 'quote'
  target: Omit<DeckFactTarget, 'slot'>
  quote: string
  authorName: string
  authorRole: string
}

/** La foto real de un caso. */
export interface DeckPhotoFact extends DeckFactBase {
  kind: 'photo'
  target: DeckFactTarget
  photoAssetId: string
  alt: string
}

/** Los datos reales del cliente de una lámina de muestra (respuesta de IA de ejemplo, mapa de diagnóstico). */
export interface DeckSampleDataFact extends DeckFactBase {
  kind: 'sample-data'
  target: Omit<DeckFactTarget, 'slot'>
  /** Valor por nombre de slot del grupo de datos de la receta; sólo texto, números y listas de ellos. */
  values: Record<string, unknown>
}

export type DeckSlotFact = DeckFigureFact | DeckLogoFact | DeckQuoteFact | DeckPhotoFact | DeckSampleDataFact

// ─────────────────────────────────────────────────────────────────────────────
// Contexto (lo entrega el consumer ya autorizado) y fuentes resueltas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El contexto del binding. El consumer (TASK-1932, TASK-1921 o la CLI local) ya autorizó al sujeto:
 * `assertProposalStudioAccessForSubject` en Proposal Studio. El binder no autoriza personas, sólo datos.
 */
export type DeckBindingContext =
  | {
      kind: 'proposal'
      ownerOrgId: string
      proposalId: string
      /** A quién va el deck: `client_facing` rechaza toda evidencia `internal`. */
      audience: ProposalAudience
      facts?: DeckSlotFact[]
    }
  | {
      /** Brochure, pitch o QBR de marca propia: sin `Proposal`, sólo hechos con un asset de respaldo. */
      kind: 'brand'
      audience: ProposalAudience
      facts?: DeckSlotFact[]
    }

/** Una evidencia de la `Proposal` tal como la ve el binder (la forma de la proyección allowlisted). */
export interface DeckBindingEvidence {
  evidenceId: string
  classification: ProposalEvidenceClassification
  audience: ProposalAudience
  locator: string
  method: string
  asOf: string
  sourceAssetId: string | null
}

/** Las fuentes ya leídas por readers canónicos: el núcleo del binding es puro sobre esto. */
export interface DeckBindingSources {
  audience: ProposalAudience
  proposal: {
    proposalId: string
    clientOrganizationId: string
    /** TODA la evidencia de la propuesta: el binder aplica la regla de audiencia y reporta la interna. */
    evidence: DeckBindingEvidence[]
  } | null
  /** Las variantes del logo del cliente de la propuesta (Account 360), o `null` sin propuesta u organización. */
  clientLogo: { logoAssetId: string | null; logoOnDarkAssetId: string | null } | null
  /** Fuera de una `Proposal`: los assets de respaldo verificados, con su fecha. */
  intentAssets: Record<string, { asOf: string }>
  facts: DeckSlotFact[]
}

// ─────────────────────────────────────────────────────────────────────────────
// El rastro por slot y el resultado
// ─────────────────────────────────────────────────────────────────────────────

export type DeckSlotBinderKind =
  | 'client-logo'
  | 'metric'
  | 'metric-source'
  | 'metric-delta'
  | 'proof-logo'
  | 'proof-figures'
  | 'proof-quote'
  | 'proof-photo'
  | 'money'
  | 'team'
  | 'sample-data'

export type SlotBindingSource = 'account-360' | 'proposal-evidence' | 'economic-facts' | 'roster-facts' | 'intent'

export const SLOT_UNBOUND_REASONS = [
  'no-evidence',
  'internal-evidence',
  'no-authorization',
  'no-frozen-quote',
  'no-real-photo',
  'no-on-dark-logo',
  'no-logo',
  'no-proposal',
  'no-roster-facts',
  'below-minimum',
  'too-many-facts',
  'not-in-quote',
  'illustrative-sample'
] as const

export type SlotUnboundReason = (typeof SLOT_UNBOUND_REASONS)[number]

/** El rastro de un slot de datos: de dónde salió su valor o por qué quedó sin ligar. */
export interface SlotBinding {
  slideIndex: number
  recipeId: string
  slot: string
  binder: DeckSlotBinderKind
  status: 'bound' | 'unbound'
  source?: SlotBindingSource
  /** La evidencia cuando es una sola. */
  evidenceRef?: string
  /** Todas las evidencias del slot (una por cifra o logo). */
  evidenceRefs?: string[]
  /** La fecha de la evidencia más antigua del slot: el dato vale desde ahí. */
  asOf?: string
  reason?: SlotUnboundReason
  /** En las láminas de muestra: `illustrative` (lleva su marca) o `client` (datos reales con `evidenceRef`). */
  dataOrigin?: 'illustrative' | 'client'
}

export interface DeckSlotBindingResult {
  /** `true` si el plan ligado no tiene errores del validador ni del binding. */
  ok: boolean
  /** El plan con los slots de datos ligados (los sin dato, fuera; los montos, `[MONTO]`). */
  plan: DeckPlan
  bindings: SlotBinding[]
  /** Los del validador de TASK-1929 sobre el plan ligado + los del binding (`source: 'binding'`). */
  issues: DeckPlanIssue[]
}
