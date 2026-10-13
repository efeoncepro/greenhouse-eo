import { GH_CONTRACTOR_SUBMISSIONS as COPY } from '@/lib/copy/contractor-submissions'

import { ContractorEngagementValidationError } from '../errors'

const isIsoCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false

  const date = new Date(`${value}T00:00:00.000Z`)

  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Dates are optional in the command contract; display labels are never dates. */
export const assertContractorServicePeriod = (
  start: string | null | undefined,
  end: string | null | undefined
): void => {
  if ((start != null && !isIsoCalendarDate(start)) || (end != null && !isIsoCalendarDate(end))) {
    throw new ContractorEngagementValidationError(COPY.invalidDate, 'invalid_service_period_date', 422)
  }

  if (start && end && end < start) {
    throw new ContractorEngagementValidationError(COPY.reversedPeriod, 'invalid_service_period_range', 422)
  }
}
