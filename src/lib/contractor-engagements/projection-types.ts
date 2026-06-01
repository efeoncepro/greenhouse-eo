/**
 * TASK-796 — Contractor self-service + HR workbench projection types (PURE).
 *
 * NOT server-only: shared by the server projection orchestrator, the runtime
 * views and the pure mapper tests. This is the single canonical view-model the
 * `/my/contractor` and `/hr/contractors` runtime surfaces consume — they NEVER
 * re-derive readiness, timeline, blockers or KPIs from raw domain rows.
 *
 * The shape mirrors the approved mockup `ContractorScenario`
 * (src/views/greenhouse/contractors/mockup/types.ts) so the promoted runtime
 * views wire with minimal change. The mockup keeps its own local copy intact as
 * the approved design reference + GVC scenarios; this is the runtime SSOT.
 *
 * Finance-only data (provider statements, fees, internal amounts) is filtered
 * OUT of the contractor-facing scenario by the projection (arch
 * GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1 §Access policy).
 */

import type {
  ContractorClassificationRiskStatus,
  ContractorEngagementStatus,
  ContractorPaymentCadence,
  ContractorRateType
} from './types'

export const CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION = 'contractor-self-service.v1' as const
export const CONTRACTOR_HR_WORKBENCH_CONTRACT_VERSION = 'contractor-hr-workbench.v1' as const

export type ContractorTone = 'success' | 'warning' | 'error' | 'info' | 'secondary'

/**
 * Derived scenario kind. NOT a stored enum — computed from the real engagement +
 * latest submission + latest payable state. Drives the hero copy + a couple of
 * view branches (dispute drawer, closure sidecar). `no_engagement` is the honest
 * empty state when the member has no active contractor engagement.
 */
export type ContractorScenarioKind =
  | 'honorarios_ready'
  | 'submitted_review'
  | 'disputed'
  | 'international_blocked'
  | 'paid'
  | 'closure_pending'
  | 'no_engagement'

/** Who must act on a blocker. Two-valued for contractor-facing clarity. */
export type ContractorBlockerResponsable = 'Contractor' | 'Finance'

export interface ContractorTimelineStep {
  id: string
  label: string
  detail: string
  status: 'done' | 'current' | 'blocked' | 'upcoming'
  timestamp?: string
}

export interface ContractorSupportItem {
  id: string
  label: string
  kind: 'invoice' | 'evidence' | 'tax' | 'provider'
  status: string
  tone: ContractorTone
  filename?: string
}

export interface ContractorSubmissionItem {
  id: string
  title: string
  period: string
  amount: number
  currency: string
  status: string
  tone: ContractorTone
  responsable: string
  nextAction: string
}

export interface ContractorScenarioKpi {
  id: string
  title: string
  value: string
  subtitle: string
  tone: ContractorTone
  icon: string
}

export interface ContractorScenarioBlocker {
  id: string
  title: string
  detail: string
  tone: ContractorTone
  responsable: ContractorBlockerResponsable
}

/**
 * TASK-960 — a paid payable's remittance advice ("Comprobante de Pago") availability,
 * surfaced on the self-service hub + admin workbench. The `number` (EO-RA-NNNNNN) is
 * read-only here; it is allocated lazily (idempotent) the first time the document is
 * emitted (viewed/downloaded), so it is null until first emission.
 */
export interface ContractorRemittanceItem {
  payableId: string
  number: string | null
  net: number
  currency: string
  dateIso: string
  regimeLabel: string
  /** Populated on the admin surface (the contractor's name); absent on self-service. */
  contractorName?: string
}

/**
 * Contractor-facing scenario view-model. Mirrors the approved mockup
 * `ContractorScenario` field-for-field so the runtime view reuses the approved
 * information architecture.
 */
export interface ContractorSelfServiceScenario {
  kind: ContractorScenarioKind
  eyebrow: string
  title: string
  summary: string
  primaryAction: string
  primaryActionIcon: string
  primaryActionDisabled?: boolean
  primaryActionReason?: string
  secondaryAction: string
  secondaryHref: string
  contractorEngagementId: string
  engagementPublicId: string
  contractorName: string
  relationshipSubtype: string
  /** Entidad contratante — leída de legal_entity_organization_id, NUNCA hardcodeada. */
  legalEntityLabel: string
  country: string
  currency: string
  paymentCurrency: string
  servicePeriod: string
  paymentModel: string
  paymentCadence: string
  taxResponsable: string
  /** Agreed compensation (read-only for the contractor — set by HR, TASK-968). */
  agreedRate: ContractorAgreedRate
  readinessLabel: string
  readinessTone: ContractorTone
  readinessDetail: string
  paymentProfileLabel: string
  paymentProfileDetail: string
  /** True cuando el engagement está terminando o terminado (closure sidecar visibility). */
  closureVisible: boolean
  kpis: ContractorScenarioKpi[]
  supportItems: ContractorSupportItem[]
  submissions: ContractorSubmissionItem[]
  timeline: ContractorTimelineStep[]
  blockers: ContractorScenarioBlocker[]
  /** Paid payables with a remittance advice available (TASK-960). */
  paidRemittances: ContractorRemittanceItem[]
}

export interface ContractorProjectionDegradedReason {
  code: string
  source: string
  severity: 'warning' | 'error'
  message: string
}

export interface ContractorSelfServiceProjection {
  /** `active` when an engagement was resolved; `no_engagement` is the honest empty state. */
  state: 'active' | 'no_engagement'
  scenario: ContractorSelfServiceScenario | null
  degraded: ContractorProjectionDegradedReason[]
  generatedAt: string
  contractVersion: typeof CONTRACTOR_SELF_SERVICE_CONTRACT_VERSION
}

// ── HR workbench ────────────────────────────────────────────────────────────

/** Agreed compensation snapshot (TASK-968) — set ONLY by HR; the contractor never edits it. */
export interface ContractorAgreedRate {
  rateType: ContractorRateType
  rateAmount: number | null
  paymentCadence: ContractorPaymentCadence
  currency: string
}

export interface ContractorWorkbenchQueueRow {
  contractorEngagementId: string
  engagementPublicId: string
  contractorName: string
  relationshipSubtype: string
  country: string
  legalEntityLabel: string
  /** Agreed compensation for the inspector compensation panel (TASK-968). */
  agreedRate: ContractorAgreedRate
  /** Pending review work submissions for this engagement (submitted/disputed). */
  pendingCount: number
  /** Blocked payables for this engagement. */
  blockedPayableCount: number
  statusLabel: string
  statusTone: ContractorTone
  amount: string
  responsable: string
  nextAction: string
  /**
   * Raw engagement classification-risk enum value (`clear` / `needs_review` /
   * `legal_review_required` / `blocked`). Typed `string` for tolerance, but
   * carries the canonical enum so the inspector lifecycle controls can gate
   * "activar" via `isClassificationRiskBlocking`.
   */
  classificationRiskStatus: ContractorClassificationRiskStatus
  /**
   * TASK-975 — the engagement's raw lifecycle status (NOT the work-queue
   * `statusLabel`/`statusTone`, which describe the review state). The inspector
   * lifecycle controls derive valid transitions from this.
   */
  lifecycleStatus: ContractorEngagementStatus
}

export interface ContractorWorkbenchSignal {
  id: string
  title: string
  description: string
  statusLabel: string
  statusTone: ContractorTone
  statusIcon: string
  code: string
}

export interface ContractorHrWorkbenchProjection {
  /** Cola de revisión: engagements con ítems accionables (triage). */
  queue: ContractorWorkbenchQueueRow[]
  /** TASK-986 — directorio: TODOS los engagements no terminales (browse). */
  directory: ContractorWorkbenchQueueRow[]
  totals: {
    inReview: number
    blocked: number
    readyForFinance: number
    paid: number
  }
  /** Issued remittance advices for paid payables (TASK-960). */
  remittances: ContractorRemittanceItem[]
  signals: ContractorWorkbenchSignal[]
  degraded: ContractorProjectionDegradedReason[]
  generatedAt: string
  contractVersion: typeof CONTRACTOR_HR_WORKBENCH_CONTRACT_VERSION
}
