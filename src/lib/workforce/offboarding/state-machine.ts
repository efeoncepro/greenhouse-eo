import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'

import type { OffboardingCase, OffboardingCaseStatus, TransitionOffboardingCaseInput } from './types'

const TRANSITIONS: Record<OffboardingCaseStatus, OffboardingCaseStatus[]> = {
  draft: ['needs_review', 'approved', 'blocked', 'cancelled'],
  needs_review: ['draft', 'approved', 'blocked', 'cancelled'],
  approved: ['scheduled', 'blocked', 'cancelled'],
  scheduled: ['blocked', 'executed', 'cancelled'],
  blocked: ['needs_review', 'approved', 'scheduled', 'cancelled'],
  executed: [],
  cancelled: []
}

export const isTerminalOffboardingStatus = (status: OffboardingCaseStatus) =>
  status === 'executed' || status === 'cancelled'

/**
 * TASK-1349 — a case born from an access signal (`separationType='identity_only'`)
 * reviewed as `access_only` is informational: nothing to approve, schedule or
 * settle. Closing it may skip the labor lifecycle steps.
 */
const isReviewedAccessOnlyCase = (current: OffboardingCase) =>
  current.separationType === 'identity_only' &&
  current.ruleLane === 'identity_only' &&
  current.review?.decision === 'access_only'

const ACCESS_ONLY_FAST_TRACK_SOURCES: ReadonlySet<OffboardingCaseStatus> = new Set<OffboardingCaseStatus>([
  'needs_review',
  'approved',
  'scheduled',
  'blocked'
])

export const assertOffboardingTransition = (
  current: OffboardingCase,
  input: TransitionOffboardingCaseInput
) => {
  const allowed = TRANSITIONS[current.status]

  const fastTrackAccessOnly =
    input.status === 'executed' && isReviewedAccessOnlyCase(current) && ACCESS_ONLY_FAST_TRACK_SOURCES.has(current.status)

  if (!allowed.includes(input.status) && !fastTrackAccessOnly) {
    throw new HrCoreValidationError(`Invalid offboarding transition: ${current.status} -> ${input.status}.`, 400, {
      currentStatus: current.status,
      requestedStatus: input.status,
      allowed
    })
  }

  // TASK-1349 — a case opened by an access signal cannot become a labor exit
  // by clicking "approve": the operator must first decide, explicitly and
  // audited, whether it was access-only or a real termination (review command).
  if (
    (input.status === 'approved' || input.status === 'scheduled' || input.status === 'executed') &&
    current.separationType === 'identity_only' &&
    !current.review
  ) {
    throw new HrCoreValidationError(
      'Este caso nació de una señal de acceso y no tiene revisión. Revísalo primero (solo acceso o término de relación) antes de aprobar, programar o ejecutar.',
      409,
      { currentStatus: current.status, separationType: current.separationType, required: 'offboarding_case.review' },
      'offboarding_case_review_required'
    )
  }

  const effectiveDate = input.effectiveDate !== undefined ? input.effectiveDate : current.effectiveDate
  const lastWorkingDay = input.lastWorkingDay !== undefined ? input.lastWorkingDay : current.lastWorkingDay

  const exceptionReason =
    input.lastWorkingDayAfterEffectiveReason !== undefined
      ? input.lastWorkingDayAfterEffectiveReason
      : current.lastWorkingDayAfterEffectiveReason

  if ((input.status === 'approved' || input.status === 'scheduled' || input.status === 'executed') && !effectiveDate) {
    throw new HrCoreValidationError('effectiveDate is required before approving, scheduling or executing offboarding.', 400)
  }

  if ((input.status === 'scheduled' || input.status === 'executed') && !lastWorkingDay) {
    throw new HrCoreValidationError('lastWorkingDay is required before scheduling or executing offboarding.', 400)
  }

  if (effectiveDate) assertDateString(effectiveDate, 'effectiveDate')
  if (lastWorkingDay) assertDateString(lastWorkingDay, 'lastWorkingDay')

  if (effectiveDate && lastWorkingDay && lastWorkingDay > effectiveDate && !normalizeNullableString(exceptionReason)) {
    throw new HrCoreValidationError(
      'lastWorkingDay cannot be after effectiveDate without lastWorkingDayAfterEffectiveReason.',
      400
    )
  }

  if (input.status === 'blocked' && !normalizeNullableString(input.blockedReason ?? current.blockedReason)) {
    throw new HrCoreValidationError('blockedReason is required when blocking an offboarding case.', 400)
  }
}
