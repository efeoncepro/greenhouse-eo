/**
 * TASK-790 — Deterministic classification-risk gate (pure). Slice 3 logic,
 * extracted as a pure function so it is unit-testable and reused by create +
 * review commands.
 *
 * Arch doc "Riesgo de clasificacion laboral es first-class": when a contractor
 * shows subordination/dependency signals Greenhouse must NOT auto-resolve — it
 * raises `legal_review_required` and blocks approval/payment readiness.
 *
 * Severity order: clear < needs_review < legal_review_required < blocked.
 *
 * Rules (V1, deterministic):
 *   - `blocked` is a MANUAL operator escalation (never auto-derived).
 *   - Material subordination → `legal_review_required`:
 *       (imposedFixedSchedule AND directSupervision)
 *       OR (exclusivity AND economicDependency)
 *       OR internalRoleIndistinguishable
 *   - Soft signals → `needs_review`:
 *       immediateEmployeeContinuity OR recurringPaymentsWithoutDeliverables
 *   - `clear` requires an EXPLICIT review (`reviewed=true`) AND zero factors.
 *     A fresh, unreviewed engagement can never be `clear` — it is at least
 *     `needs_review`.
 */
import type {
  ContractorClassificationRiskFactors,
  ContractorClassificationRiskStatus
} from './types'

const SEVERITY_ORDER: Record<ContractorClassificationRiskStatus, number> = {
  clear: 0,
  needs_review: 1,
  legal_review_required: 2,
  blocked: 3
}

const max = (
  a: ContractorClassificationRiskStatus,
  b: ContractorClassificationRiskStatus
): ContractorClassificationRiskStatus => (SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b)

/** Pure factor-derived level, ignoring review state. */
export const deriveFactorRiskLevel = (
  factors: ContractorClassificationRiskFactors
): ContractorClassificationRiskStatus => {
  const materialSubordination =
    (Boolean(factors.imposedFixedSchedule) && Boolean(factors.directSupervision)) ||
    (Boolean(factors.exclusivity) && Boolean(factors.economicDependency)) ||
    Boolean(factors.internalRoleIndistinguishable)

  if (materialSubordination) {
    return 'legal_review_required'
  }

  const softSignal =
    Boolean(factors.immediateEmployeeContinuity) ||
    Boolean(factors.recurringPaymentsWithoutDeliverables)

  if (softSignal) {
    return 'needs_review'
  }

  return 'clear'
}

export interface ComputeClassificationRiskInput {
  factors: ContractorClassificationRiskFactors
  /** Operator-asserted review outcome. Required to reach `clear`. */
  reviewed: boolean
  /** Explicit manual escalation. Overrides everything when true. */
  block?: boolean
}

export const computeClassificationRisk = ({
  factors,
  reviewed,
  block = false
}: ComputeClassificationRiskInput): ContractorClassificationRiskStatus => {
  if (block) {
    return 'blocked'
  }

  const factorLevel = deriveFactorRiskLevel(factors)

  // An unreviewed engagement never auto-clears: floor at needs_review.
  const reviewFloor: ContractorClassificationRiskStatus = reviewed ? 'clear' : 'needs_review'

  return max(factorLevel, reviewFloor)
}

/**
 * Readiness/lifecycle gate: an engagement cannot become (or stay) `active`
 * while risk is blocking. Mirrors the DB CHECK
 * `contractor_engagements_active_requires_clear_risk`.
 */
export const isClassificationRiskBlocking = (
  status: ContractorClassificationRiskStatus
): boolean => status === 'legal_review_required' || status === 'blocked'

/**
 * TASK-985 — Onboarding auto-activation predicate. Un engagement recién
 * onboardeado se puede activar de inmediato cuando su clasificación NO es
 * bloqueante (`clear` o `needs_review`). `needs_review` es una señal blanda que
 * NO traba la activación (mirror del CHECK
 * `contractor_engagements_active_requires_clear_risk`, que solo bloquea
 * `legal_review_required`/`blocked`). Solo el riesgo bloqueante retiene el
 * engagement en `draft` para revisión legal.
 */
export const shouldAutoActivateOnOnboard = (
  status: ContractorClassificationRiskStatus
): boolean => !isClassificationRiskBlocking(status)
