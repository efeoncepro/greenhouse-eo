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

export const assertOffboardingTransition = (
  current: OffboardingCase,
  input: TransitionOffboardingCaseInput
) => {
  const allowed = TRANSITIONS[current.status]

  if (!allowed.includes(input.status)) {
    throw new HrCoreValidationError(`Invalid offboarding transition: ${current.status} -> ${input.status}.`, 400, {
      currentStatus: current.status,
      requestedStatus: input.status,
      allowed
    })
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
