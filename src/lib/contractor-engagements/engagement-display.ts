/**
 * TASK-975 — Contractor engagement display maps (PURE, client + server safe).
 *
 * Canonical es-CL label / tone / icon maps for the engagement detail drawer +
 * lifecycle / classification surfaces. Strings are sourced from the domain copy
 * module `GH_CONTRACTOR_COMPENSATION` (single source of truth — TASK-265). This
 * REPLACES the mockup's inline maps for runtime; the mockup keeps its own copy.
 *
 * NO `import 'server-only'` — these maps are consumed by client drawers/dialogs.
 */

import type { ThemeColor } from '@core/types'

import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'

import {
  RATE_TYPE_OPTIONS,
  cadenceLabel,
  rateTypeLabel,
  type ContractorPaymentCadence,
  type ContractorRateType
} from './compensation-display'
import type {
  ContractorBonusPolicy,
  ContractorClassificationRiskFactors,
  ContractorClassificationRiskStatus,
  ContractorEngagementPayrollVia,
  ContractorEngagementStatus,
  ContractorEngagementSubtype,
  ContractorPaymentModel,
  ContractorTaxComplianceOwner
} from './types'

// Re-export the rate/cadence helpers so detail surfaces have one import.
export { RATE_TYPE_OPTIONS, cadenceLabel, rateTypeLabel }
export type { ContractorPaymentCadence, ContractorRateType }

// ── Lifecycle status ─────────────────────────────────────────────────────────

export const engagementStatusLabel = (status: ContractorEngagementStatus): string =>
  C.lifecycle.state[status]

export const engagementStatusTone = (status: ContractorEngagementStatus): ThemeColor => {
  switch (status) {
    case 'active':
      return 'success'
    case 'paused':
    case 'ending':
      return 'warning'
    case 'draft':
    case 'pending_review':
      return 'info'
    case 'cancelled':
      return 'error'
    case 'ended':
    default:
      return 'secondary'
  }
}

// ── Classification status ────────────────────────────────────────────────────

export const classificationStatusLabel = (status: ContractorClassificationRiskStatus): string =>
  C.classification.status[status]

export const classificationStatusTone = (
  status: ContractorClassificationRiskStatus
): ThemeColor => {
  switch (status) {
    case 'clear':
      return 'success'
    case 'needs_review':
      return 'warning'
    case 'legal_review_required':
    case 'blocked':
    default:
      return 'error'
  }
}

export const classificationStatusIcon = (status: ContractorClassificationRiskStatus): string => {
  switch (status) {
    case 'clear':
      return 'tabler-circle-check'
    case 'needs_review':
      return 'tabler-alert-triangle'
    case 'legal_review_required':
      return 'tabler-gavel'
    case 'blocked':
    default:
      return 'tabler-lock'
  }
}

/** Maps the classification tone to the MUI `Alert` severity (no `info`/`secondary`). */
export const classificationAlertSeverity = (
  status: ContractorClassificationRiskStatus
): 'success' | 'warning' | 'error' => {
  const tone = classificationStatusTone(status)

  return tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'error'
}

// ── The 7 classification factors (key → label + description) ──────────────────

export const CLASSIFICATION_FACTOR_KEYS: (keyof ContractorClassificationRiskFactors)[] = [
  'imposedFixedSchedule',
  'directSupervision',
  'exclusivity',
  'economicDependency',
  'immediateEmployeeContinuity',
  'internalRoleIndistinguishable',
  'recurringPaymentsWithoutDeliverables'
]

export interface ClassificationFactorMeta {
  label: string
  description: string
}

export const classificationFactorMeta = (
  key: keyof ContractorClassificationRiskFactors
): ClassificationFactorMeta => C.classification.factors[key]

// ── Engagement detail labels ─────────────────────────────────────────────────

export const relationshipSubtypeLabel = (v: ContractorEngagementSubtype): string => {
  switch (v) {
    case 'honorarios_cl':
      return 'Honorarios Chile'
    case 'freelance':
      return 'Freelance'
    case 'independent_professional':
      return 'Profesional independiente'
    case 'international_contractor':
      return 'Contractor internacional'
    case 'provider_platform':
    default:
      return 'Plataforma de proveedor'
  }
}

export const payrollViaLabel = (v: ContractorEngagementPayrollVia): string => {
  switch (v) {
    case 'internal':
      return 'Interno'
    case 'deel':
      return 'Deel'
    case 'remote':
      return 'Remote'
    case 'oyster':
      return 'Oyster'
    case 'manual_provider':
      return 'Proveedor manual'
    case 'direct_international':
    default:
      return 'Directo internacional'
  }
}

export const paymentModelLabel = (v: ContractorPaymentModel): string => {
  switch (v) {
    case 'fixed_recurring':
      return 'Fijo recurrente'
    case 'weekly_timesheet':
      return 'Timesheet semanal'
    case 'milestone':
      return 'Por hito'
    case 'project_fee':
      return 'Fee de proyecto'
    case 'payg_invoice':
      return 'Pago por invoice'
    case 'off_cycle':
    default:
      return 'Fuera de ciclo'
  }
}

export const taxOwnerLabel = (v: ContractorTaxComplianceOwner): string => {
  switch (v) {
    case 'greenhouse_policy':
      return 'Política Greenhouse'
    case 'provider_owned':
      return 'Lo asume el proveedor'
    case 'manual_review_required':
      return 'Requiere revisión manual'
    case 'country_engine_owned':
    default:
      return 'Motor de país'
  }
}

export const bonusPolicyLabel = (v: ContractorBonusPolicy): string => {
  switch (v) {
    case 'none':
      return 'Sin bono'
    case 'fixed':
      return 'Bono fijo'
    case 'ico_backed':
    default:
      return 'Bono según ICO'
  }
}

export const countryLabel = (code: string): string => {
  switch (code) {
    case 'CL':
      return 'Chile'
    case 'CO':
      return 'Colombia'
    case 'AR':
      return 'Argentina'
    case 'MX':
      return 'México'
    default:
      return code
  }
}

// ── Lifecycle transition CTA copy ─────────────────────────────────────────────

export type TransitionCopyKey =
  | 'activate'
  | 'sendToReview'
  | 'returnToDraft'
  | 'pause'
  | 'resume'
  | 'startEnding'
  | 'finish'
  | 'cancel'

/** Resolve the right CTA copy key for a (from → to) transition. */
export const transitionCopyKey = (
  from: ContractorEngagementStatus,
  to: ContractorEngagementStatus
): TransitionCopyKey => {
  if (to === 'cancelled') return 'cancel'
  if (to === 'draft') return 'returnToDraft'
  if (to === 'pending_review') return 'sendToReview'
  if (to === 'paused') return 'pause'
  if (to === 'ending') return 'startEnding'
  if (to === 'ended') return 'finish'

  // to === 'active'
  return from === 'paused' ? 'resume' : 'activate'
}

export const transitionCtaLabel = (key: TransitionCopyKey): string => C.lifecycle[key]

/** Tabler icon per transition CTA. */
export const transitionIcon = (key: TransitionCopyKey): string => {
  switch (key) {
    case 'activate':
    case 'resume':
      return 'tabler-player-play'
    case 'sendToReview':
      return 'tabler-eye-check'
    case 'returnToDraft':
      return 'tabler-arrow-back-up'
    case 'pause':
      return 'tabler-player-pause'
    case 'startEnding':
      return 'tabler-hourglass'
    case 'finish':
      return 'tabler-flag-check'
    case 'cancel':
    default:
      return 'tabler-circle-x'
  }
}

/** Non-trivial transitions require a reason (pause / ending / cancel). */
export const transitionRequiresReason = (to: ContractorEngagementStatus): boolean =>
  to === 'paused' || to === 'ending' || to === 'cancelled'
