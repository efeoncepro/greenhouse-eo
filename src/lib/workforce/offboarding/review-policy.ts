import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'
import { normalizeContractType, normalizePayRegime, normalizePayrollVia } from '@/types/hr-contracts'

import { resolveOffboardingLane } from './lane'
import { isTerminalOffboardingStatus } from './state-machine'
import type {
  OffboardingCase,
  OffboardingCaseReviewRecord,
  OffboardingCaseStatus,
  OffboardingLaneDecision,
  OffboardingSeparationType,
  ReviewOffboardingCaseInput
} from './types'

/**
 * TASK-1349 — Pure derivation of a case review. NO IO.
 *
 * Turns an explicit human decision (`access_only` | `relationship_ended`) over
 * an EXISTING case into the next persisted facts: separation type, lane +
 * requirements (canonical matrix), dates, status and the append-only review
 * record. The store applies it inside one transaction; the API preview shows
 * it before any write.
 *
 * Invariants it enforces:
 * - never infers a legal cause: `relationship_ended` demands an explicit,
 *   supported `separationType`;
 * - never assumes "today": every date must be declared;
 * - never cancels/creates another case to dodge uniqueness — it corrects the
 *   one it was given;
 * - a stale screen never overwrites a newer decision (`expectedUpdatedAt`);
 * - a material change invalidates a previous approval (status goes back to
 *   `needs_review`) unless the caller is allowed to approve in the same act.
 */

export const MIN_REVIEW_REASON_CHARS = 10

const RELATIONSHIP_ENDED_SEPARATION_TYPES: ReadonlySet<OffboardingSeparationType> = new Set<OffboardingSeparationType>([
  'resignation',
  'termination',
  'fixed_term_expiry',
  'mutual_agreement',
  'contract_end',
  'other'
])

export interface OffboardingCaseReviewDerivation {
  next: {
    separationType: OffboardingSeparationType
    lane: OffboardingLaneDecision
    effectiveDate: string
    lastWorkingDay: string
    lastWorkingDayAfterEffectiveReason: string | null
    status: Extract<OffboardingCaseStatus, 'needs_review' | 'approved'>
    notes: string | null
  }
  review: OffboardingCaseReviewRecord
  /** Human-readable list of what changes (for preview/audit). es-CL keys, no PII. */
  changes: string[]
  /** `true` when a previous approval/scheduling was invalidated by this review. */
  approvalInvalidated: boolean
}

const normalizeIso = (value: string | null | undefined): string | null => {
  if (!value) return null

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export const assertReviewVersionMatches = (current: Pick<OffboardingCase, 'updatedAt'>, expectedUpdatedAt: string | null | undefined) => {
  const expected = normalizeIso(expectedUpdatedAt)
  const actual = normalizeIso(current.updatedAt)

  if (!expected) {
    throw new HrCoreValidationError(
      'Falta la versión del caso (expectedUpdatedAt). Recarga el caso antes de revisarlo.',
      400,
      { field: 'expectedUpdatedAt' },
      'offboarding_case_version_required'
    )
  }

  if (expected !== actual) {
    throw new HrCoreValidationError(
      'El caso cambió desde que lo abriste. Recarga para ver la versión vigente antes de guardar.',
      409,
      { expectedUpdatedAt: expected, currentUpdatedAt: actual },
      'offboarding_case_version_conflict'
    )
  }
}

export const deriveOffboardingCaseReview = ({
  current,
  input,
  actorUserId,
  canApprove,
  now = new Date()
}: {
  current: OffboardingCase
  input: ReviewOffboardingCaseInput
  actorUserId: string
  /** The caller holds `hr.offboarding_case:approve`; honoured only with `approveNow`. */
  canApprove: boolean
  now?: Date
}): OffboardingCaseReviewDerivation => {
  if (isTerminalOffboardingStatus(current.status)) {
    throw new HrCoreValidationError(
      'Este caso ya está cerrado y no puede revisarse. Si la salida fue mal registrada, usa el command compensatorio auditado.',
      409,
      { currentStatus: current.status },
      'offboarding_case_terminal'
    )
  }

  const reason = normalizeNullableString(input.reason) ?? ''

  if (reason.length < MIN_REVIEW_REASON_CHARS) {
    throw new HrCoreValidationError(
      `El motivo de la revisión debe tener al menos ${MIN_REVIEW_REASON_CHARS} caracteres.`,
      400,
      { field: 'reason' },
      'offboarding_review_reason_too_short'
    )
  }

  assertReviewVersionMatches(current, input.expectedUpdatedAt)

  if (input.decision !== 'access_only' && input.decision !== 'relationship_ended') {
    throw new HrCoreValidationError(
      'La decisión debe ser "solo acceso" o "terminó la relación".',
      400,
      { field: 'decision' },
      'offboarding_review_decision_invalid'
    )
  }

  const effectiveDate = normalizeNullableString(input.effectiveDate)
  const lastWorkingDayInput = normalizeNullableString(input.lastWorkingDay)

  if (!effectiveDate) {
    throw new HrCoreValidationError(
      input.decision === 'access_only'
        ? 'Declara la fecha en que se dio de baja el acceso. No se asume la fecha de hoy.'
        : 'Declara la fecha efectiva del término. No se asume la fecha de hoy.',
      400,
      { field: 'effectiveDate' },
      'offboarding_review_dates_required'
    )
  }

  assertDateString(effectiveDate, 'effectiveDate')

  if (input.decision === 'relationship_ended' && !lastWorkingDayInput) {
    throw new HrCoreValidationError(
      'Declara el último día trabajado. No se asume la fecha de hoy.',
      400,
      { field: 'lastWorkingDay' },
      'offboarding_review_dates_required'
    )
  }

  const lastWorkingDay = lastWorkingDayInput ?? effectiveDate

  assertDateString(lastWorkingDay, 'lastWorkingDay')

  const exceptionReason = normalizeNullableString(input.lastWorkingDayAfterEffectiveReason)

  if (lastWorkingDay > effectiveDate && !exceptionReason) {
    throw new HrCoreValidationError(
      'El último día trabajado no puede ser posterior a la fecha efectiva sin una razón explícita.',
      400,
      { field: 'lastWorkingDayAfterEffectiveReason' },
      'offboarding_review_dates_inconsistent'
    )
  }

  let separationType: OffboardingSeparationType

  if (input.decision === 'access_only') {
    separationType = 'identity_only'
  } else {
    const requested = input.separationType ?? null

    if (!requested || !RELATIONSHIP_ENDED_SEPARATION_TYPES.has(requested)) {
      throw new HrCoreValidationError(
        'Declara la causal del término (renuncia, despido, fin de contrato, mutuo acuerdo, vencimiento de plazo u otra). No se infiere de la fecha.',
        400,
        { field: 'separationType', allowed: Array.from(RELATIONSHIP_ENDED_SEPARATION_TYPES) },
        'offboarding_review_separation_type_required'
      )
    }

    separationType = requested
  }

  const contractType = normalizeContractType(current.contractTypeSnapshot === 'unknown' ? null : current.contractTypeSnapshot)
  const payRegime = normalizePayRegime(current.payRegimeSnapshot === 'unknown' ? null : current.payRegimeSnapshot, contractType)

  const payrollVia = normalizePayrollVia(
    current.payrollViaSnapshot === 'unknown' || current.payrollViaSnapshot === 'none' ? null : current.payrollViaSnapshot,
    contractType
  )

  const lane = resolveOffboardingLane({
    relationshipType: current.relationshipType,
    contractType,
    payRegime,
    payrollVia,
    separationType
  })

  const changes: string[] = []

  if (separationType !== current.separationType) changes.push('separation_type')
  if (lane.ruleLane !== current.ruleLane) changes.push('rule_lane')
  if (effectiveDate !== current.effectiveDate) changes.push('effective_date')
  if (lastWorkingDay !== current.lastWorkingDay) changes.push('last_working_day')

  const hadApproval = current.status === 'approved' || current.status === 'scheduled'
  const approveNow = Boolean(input.approveNow) && canApprove
  const status: 'needs_review' | 'approved' = approveNow ? 'approved' : 'needs_review'
  const approvalInvalidated = hadApproval && status !== 'approved'

  if (approvalInvalidated) changes.push('approval_invalidated')
  if (current.status === 'blocked') changes.push('unblocked')

  return {
    next: {
      separationType,
      lane,
      effectiveDate,
      lastWorkingDay,
      lastWorkingDayAfterEffectiveReason: exceptionReason,
      status,
      notes: normalizeNullableString(input.notes)
    },
    review: {
      decision: input.decision,
      reviewedAt: now.toISOString(),
      reviewedByUserId: actorUserId,
      reason,
      previous: {
        separationType: current.separationType,
        ruleLane: current.ruleLane,
        status: current.status,
        effectiveDate: current.effectiveDate,
        lastWorkingDay: current.lastWorkingDay
      }
    },
    changes,
    approvalInvalidated
  }
}

/**
 * Reads the persisted review record from the case metadata. Tolerant: any
 * malformed value reads as "no review" (a review is never inferred).
 */
export const readOffboardingCaseReview = (metadata: Record<string, unknown> | null | undefined): OffboardingCaseReviewRecord | null => {
  const raw = metadata?.review

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const record = raw as Partial<OffboardingCaseReviewRecord>

  if (record.decision !== 'access_only' && record.decision !== 'relationship_ended') return null
  if (typeof record.reviewedAt !== 'string' || typeof record.reviewedByUserId !== 'string') return null

  return record as OffboardingCaseReviewRecord
}
