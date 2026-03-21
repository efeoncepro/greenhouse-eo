import type { CompensationVersion, PeriodStatus } from '@/types/payroll'

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

const LOCKED_PAYROLL_STATUSES: PeriodStatus[] = ['approved', 'exported']

export const isCompensationVersionLockedByPayroll = (
  statuses: Array<PeriodStatus | null | undefined>
) => statuses.some(status => !!status && LOCKED_PAYROLL_STATUSES.includes(status))

export const getCompensationVersionLockedMessage = () =>
  'This compensation version has already been used in an approved or exported payroll period. Choose a new effective date to create a new version.'
