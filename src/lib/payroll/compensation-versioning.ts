import type { CompensationVersion, PeriodStatus } from '@/types/payroll'

import { isPayrollPeriodFinalized } from '@/lib/payroll/period-lifecycle'

export type CompensationSaveMode = 'create' | 'update'

export const getCompensationSaveMode = ({
  existingVersion,
  effectiveFrom
}: {
  existingVersion: CompensationVersion | null
  effectiveFrom: string
}): CompensationSaveMode => {
  if (existingVersion && existingVersion.effectiveFrom === effectiveFrom) {
    return 'update'
  }

  return 'create'
}

export const isCompensationVersionLockedByPayroll = (
  statuses: Array<PeriodStatus | null | undefined>
) => statuses.some(status => !!status && isPayrollPeriodFinalized(status))

export const getCompensationVersionLockedMessage = () =>
  'This compensation version has already been used in an exported payroll period. Choose a new effective date to create a new version.'
