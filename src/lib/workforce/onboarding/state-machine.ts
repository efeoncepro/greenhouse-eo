import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'

import type { TransitionOnboardingCaseInput, WorkRelationshipOnboardingCase, OnboardingCaseStatus } from './types'

const TRANSITIONS: Record<OnboardingCaseStatus, OnboardingCaseStatus[]> = {
  draft: ['needs_review', 'approved', 'blocked', 'cancelled'],
  needs_review: ['draft', 'approved', 'blocked', 'cancelled'],
  approved: ['scheduled', 'blocked', 'active', 'cancelled'],
  scheduled: ['blocked', 'active', 'cancelled'],
  blocked: ['needs_review', 'approved', 'scheduled', 'cancelled'],
  active: [],
  cancelled: []
}

export const isTerminalOnboardingStatus = (status: OnboardingCaseStatus) =>
  status === 'active' || status === 'cancelled'

export const assertOnboardingTransition = (
  current: WorkRelationshipOnboardingCase,
  input: TransitionOnboardingCaseInput
) => {
  const allowed = TRANSITIONS[current.status]

  if (!allowed.includes(input.status)) {
    throw new HrCoreValidationError(`Invalid onboarding transition: ${current.status} -> ${input.status}.`, 400, {
      currentStatus: current.status,
      requestedStatus: input.status,
      allowed
    })
  }

  const startDate = input.startDate !== undefined ? input.startDate : current.startDate
  const firstWorkingDay = input.firstWorkingDay !== undefined ? input.firstWorkingDay : current.firstWorkingDay

  if ((input.status === 'approved' || input.status === 'scheduled' || input.status === 'active') && !startDate) {
    throw new HrCoreValidationError('startDate is required before approving, scheduling or activating onboarding.', 400)
  }

  if (input.status === 'scheduled' && !firstWorkingDay) {
    throw new HrCoreValidationError('firstWorkingDay is required before scheduling onboarding.', 400)
  }

  if (startDate) assertDateString(startDate, 'startDate')
  if (firstWorkingDay) assertDateString(firstWorkingDay, 'firstWorkingDay')

  if (input.status === 'blocked' && !normalizeNullableString(input.blockedReason ?? current.blockedReason)) {
    throw new HrCoreValidationError('blockedReason is required when blocking an onboarding case.', 400)
  }
}
