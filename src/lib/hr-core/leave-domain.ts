import 'server-only'

import {
  DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE,
  getOperationalDateKey
} from '@/lib/calendar/operational-calendar'
import { loadNagerDateHolidayDateSet } from '@/lib/calendar/nager-date-holidays'

export type LeaveDayPeriod = 'full_day' | 'morning' | 'afternoon'

export type LeaveHolidaySource = 'nager' | 'empty-fallback' | 'none'

export interface LeavePolicy {
  policyId: string
  leaveTypeCode: string
  policyName: string
  accrualType: 'annual_fixed' | 'monthly_accrual' | 'unlimited' | 'custom'
  annualDays: number
  maxCarryOverDays: number
  requiresApproval: boolean
  minAdvanceDays: number
  maxConsecutiveDays: number | null
  minContinuousDays: number | null
  maxAccumulationPeriods: number | null
  progressiveEnabled: boolean
  progressiveBaseYears: number
  progressiveIntervalYears: number
  progressiveMaxExtraDays: number
  applicableEmploymentTypes: string[]
  applicablePayRegimes: string[]
  applicableContractTypes: string[]
  applicablePayrollVias: string[]
  allowNegativeBalance: boolean
  active: boolean
}

export interface LeaveDayBreakdown {
  totalDays: number
  dateKeys: string[]
  daysByYear: Map<number, number>
  holidaySource: LeaveHolidaySource
  holidayDates: Set<string>
}

export interface LeavePayrollImpactPeriod {
  periodId: string
  year: number
  month: number
  status: 'draft' | 'calculated' | 'approved' | 'exported'
}

export interface LeavePayrollImpact {
  mode: 'none' | 'recalculate_recommended' | 'deferred_adjustment_required'
  impactedPeriods: LeavePayrollImpactPeriod[]
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const holidayCache = new Map<string, Promise<Set<string>>>()

const parseDateOnly = (value: string) => {
  const match = value.match(DATE_ONLY_PATTERN)

  if (!match) {
    throw new RangeError(`Invalid date-only value: ${value}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid date-only value: ${value}`)
  }

  return { year, month, day }
}

const toDateKey = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const addUtcDays = (value: string, days: number) => {
  const parsed = parseDateOnly(value)
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))

  date.setUTCDate(date.getUTCDate() + days)

  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

const addUtcYears = (value: string, years: number) => {
  const parsed = parseDateOnly(value)
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))

  date.setUTCFullYear(date.getUTCFullYear() + years)

  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

const getYearStartDateKey = (year: number) => `${year}-01-01`

const getYearEndDateKey = (year: number) => `${year}-12-31`

const clampDateKey = (value: string, min: string, max: string) => {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

const maxDateKey = (...values: string[]) =>
  [...values].sort((left, right) => left.localeCompare(right)).at(-1) ?? values[0] ?? ''

const minDateKey = (...values: string[]) =>
  [...values].sort((left, right) => left.localeCompare(right)).at(0) ?? values[0] ?? ''

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100

export const roundLeaveDays = (value: number) => roundToTwoDecimals(value)

const isWeekendDateKey = (value: string) => {
  const parsed = parseDateOnly(value)
  const dayOfWeek = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()

  return dayOfWeek === 0 || dayOfWeek === 6
}

export const listDateKeysInRange = (startDate: string, endDate: string) => {
  parseDateOnly(startDate)
  parseDateOnly(endDate)

  if (startDate > endDate) {
    throw new RangeError('startDate must be earlier than or equal to endDate.')
  }

  const dates: string[] = []
  let cursor = startDate

  while (cursor <= endDate) {
    dates.push(cursor)
    cursor = addUtcDays(cursor, 1)
  }

  return dates
}

const listYearsInRange = (startDate: string, endDate: string) => {
  const startYear = parseDateOnly(startDate).year
  const endYear = parseDateOnly(endDate).year
  const years: number[] = []

  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year)
  }

  return years
}

const getHolidayCacheKey = (countryCode: string, year: number) => `${countryCode}:${year}`

const loadHolidayDateSetForYear = async (year: number, countryCode: string) => {
  const cacheKey = getHolidayCacheKey(countryCode, year)
  const existing = holidayCache.get(cacheKey)

  if (existing) {
    return existing
  }

  const pending = loadNagerDateHolidayDateSet(year, countryCode)

  holidayCache.set(cacheKey, pending)

  return pending
}

export const loadHolidayDateSetForRange = async ({
  startDate,
  endDate,
  countryCode
}: {
  startDate: string
  endDate: string
  countryCode: string | null
}): Promise<{ holidayDates: Set<string>; source: LeaveHolidaySource }> => {
  if (!countryCode) {
    return { holidayDates: new Set<string>(), source: 'none' }
  }

  const normalizedCountryCode = countryCode.trim().toUpperCase()

  try {
    const years = listYearsInRange(startDate, endDate)
    const holidaySets = await Promise.all(years.map(year => loadHolidayDateSetForYear(year, normalizedCountryCode)))
    const merged = new Set<string>()

    for (const holidaySet of holidaySets) {
      for (const dateKey of holidaySet) {
        merged.add(dateKey)
      }
    }

    return { holidayDates: merged, source: 'nager' }
  } catch {
    return { holidayDates: new Set<string>(), source: 'empty-fallback' }
  }
}

export const computeLeaveDayBreakdown = async ({
  startDate,
  endDate,
  countryCode,
  startPeriod = 'full_day',
  endPeriod = 'full_day'
}: {
  startDate: string
  endDate: string
  countryCode: string | null
  startPeriod?: LeaveDayPeriod
  endPeriod?: LeaveDayPeriod
}): Promise<LeaveDayBreakdown> => {
  const { holidayDates, source } = await loadHolidayDateSetForRange({
    startDate,
    endDate,
    countryCode
  })

  const dateKeys = listDateKeysInRange(startDate, endDate).filter(dateKey => {
    if (isWeekendDateKey(dateKey)) {
      return false
    }

    return !holidayDates.has(dateKey)
  })

  const daysByYear = new Map<number, number>()

  for (const dateKey of dateKeys) {
    const year = Number(dateKey.slice(0, 4))

    daysByYear.set(year, (daysByYear.get(year) ?? 0) + 1)
  }

  if (dateKeys.length === 1) {
    if (startPeriod === 'morning' || startPeriod === 'afternoon') {
      const year = Number(dateKeys[0].slice(0, 4))

      daysByYear.set(year, (daysByYear.get(year) ?? 1) - 0.5)
    }
  } else if (dateKeys.length > 1) {
    if (startPeriod === 'afternoon') {
      const firstYear = Number(dateKeys[0].slice(0, 4))

      daysByYear.set(firstYear, (daysByYear.get(firstYear) ?? 1) - 0.5)
    }

    if (endPeriod === 'morning') {
      const lastYear = Number(dateKeys[dateKeys.length - 1].slice(0, 4))

      daysByYear.set(lastYear, (daysByYear.get(lastYear) ?? 1) - 0.5)
    }
  }

  let totalDays = 0

  for (const days of daysByYear.values()) {
    totalDays += days
  }

  return {
    totalDays,
    dateKeys,
    daysByYear,
    holidaySource: source,
    holidayDates
  }
}

export const getCalendarDayDiff = (fromDate: string, toDate: string) => {
  const from = parseDateOnly(fromDate)
  const to = parseDateOnly(toDate)
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day)
  const toUtc = Date.UTC(to.year, to.month - 1, to.day)

  return Math.floor((toUtc - fromUtc) / 86_400_000)
}

export const getTodayDateKey = (timezone = DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE) =>
  getOperationalDateKey(new Date(), { timezone })

export const calculateProgressiveExtraDays = ({
  priorWorkYears,
  hireDate,
  asOfDate,
  progressiveBaseYears,
  progressiveIntervalYears,
  progressiveMaxExtraDays
}: {
  priorWorkYears: number
  hireDate: string | null
  asOfDate: string
  progressiveBaseYears: number
  progressiveIntervalYears: number
  progressiveMaxExtraDays: number
}) => {
  if (!hireDate || progressiveIntervalYears <= 0 || progressiveMaxExtraDays <= 0) {
    return 0
  }

  const hire = parseDateOnly(hireDate)
  const asOf = parseDateOnly(asOfDate)
  let completedYears = asOf.year - hire.year

  if (
    asOf.month < hire.month ||
    (asOf.month === hire.month && asOf.day < hire.day)
  ) {
    completedYears -= 1
  }

  const totalYears = Math.max(0, priorWorkYears) + Math.max(0, completedYears)
  const yearsOverBase = totalYears - progressiveBaseYears

  if (yearsOverBase < progressiveIntervalYears) {
    return 0
  }

  return Math.min(
    progressiveMaxExtraDays,
    Math.floor(yearsOverBase / progressiveIntervalYears)
  )
}

export const calculateAccruedLeaveAllowanceDays = ({
  annualDays,
  accrualType,
  hireDate,
  year,
  asOfDate
}: {
  annualDays: number
  accrualType: LeavePolicy['accrualType']
  hireDate: string | null
  year: number
  asOfDate: string
}) => {
  if (annualDays <= 0) {
    return 0
  }

  if (accrualType !== 'monthly_accrual' || !hireDate) {
    return annualDays
  }

  parseDateOnly(hireDate)
  parseDateOnly(asOfDate)

  const yearStart = getYearStartDateKey(year)
  const yearEnd = getYearEndDateKey(year)
  const effectiveAsOfDate = clampDateKey(asOfDate, yearStart, yearEnd)

  if (effectiveAsOfDate < hireDate) {
    return 0
  }

  const firstAnniversary = addUtcYears(hireDate, 1)

  if (yearStart >= firstAnniversary || effectiveAsOfDate >= firstAnniversary) {
    return annualDays
  }

  const firstServiceCycleEnd = addUtcDays(firstAnniversary, -1)
  const overlapStart = maxDateKey(hireDate, yearStart)
  const overlapEnd = minDateKey(effectiveAsOfDate, yearEnd, firstServiceCycleEnd)

  if (overlapEnd < overlapStart) {
    return 0
  }

  const firstServiceCycleDays = getCalendarDayDiff(hireDate, firstServiceCycleEnd) + 1
  const overlapDays = getCalendarDayDiff(overlapStart, overlapEnd) + 1

  if (firstServiceCycleDays <= 0 || overlapDays <= 0) {
    return 0
  }

  return roundLeaveDays((annualDays * overlapDays) / firstServiceCycleDays)
}

export const listPeriodIdsInRange = (startDate: string, endDate: string) => {
  const dates = listDateKeysInRange(startDate, endDate)
  const unique = new Set<string>()

  for (const dateKey of dates) {
    unique.add(dateKey.slice(0, 7))
  }

  return [...unique]
}

export const classifyLeavePayrollImpact = (
  impactedPeriods: LeavePayrollImpactPeriod[]
): LeavePayrollImpact => {
  if (impactedPeriods.length === 0) {
    return { mode: 'none', impactedPeriods: [] }
  }

  if (impactedPeriods.some(period => period.status === 'exported')) {
    return {
      mode: 'deferred_adjustment_required',
      impactedPeriods
    }
  }

  if (impactedPeriods.some(period => period.status === 'calculated' || period.status === 'approved')) {
    return {
      mode: 'recalculate_recommended',
      impactedPeriods
    }
  }

  return {
    mode: 'none',
    impactedPeriods
  }
}

export const isPolicyApplicableToMember = ({
  policy,
  employmentType,
  payRegime,
  contractType,
  payrollVia
}: {
  policy: LeavePolicy
  employmentType: string | null
  payRegime: string | null
  contractType: string | null
  payrollVia: string | null
}) => {
  const employmentMatch =
    policy.applicableEmploymentTypes.length === 0 ||
    (employmentType != null && policy.applicableEmploymentTypes.includes(employmentType))

  const payRegimeMatch =
    policy.applicablePayRegimes.length === 0 ||
    (payRegime != null && policy.applicablePayRegimes.includes(payRegime))

  const contractTypeMatch =
    policy.applicableContractTypes.length === 0 ||
    (contractType != null && policy.applicableContractTypes.includes(contractType))

  const payrollViaMatch =
    policy.applicablePayrollVias.length === 0 ||
    (payrollVia != null && policy.applicablePayrollVias.includes(payrollVia))

  return employmentMatch && payRegimeMatch && contractTypeMatch && payrollViaMatch
}

export const getLeaveColorByStatus = (status: string) => {
  switch (status) {
    case 'approved':
      return '#16a34a'
    case 'pending_supervisor':
    case 'pending_hr':
      return '#f59e0b'
    case 'rejected':
      return '#ef4444'
    case 'cancelled':
      return '#94a3b8'
    default:
      return '#3b82f6'
  }
}

export const getLeaveTitle = ({
  leaveTypeName,
  memberName,
  startPeriod = 'full_day',
  endPeriod = 'full_day',
  isSingleDay = false
}: {
  leaveTypeName: string
  memberName: string | null
  startPeriod?: LeaveDayPeriod
  endPeriod?: LeaveDayPeriod
  isSingleDay?: boolean
}) => {
  const base = memberName?.trim() ? `${memberName} · ${leaveTypeName}` : leaveTypeName

  if (startPeriod === 'full_day' && endPeriod === 'full_day') {
    return base
  }

  if (isSingleDay) {
    if (startPeriod === 'morning') {
      return `${base} (AM)`
    }

    if (startPeriod === 'afternoon') {
      return `${base} (PM)`
    }

    return base
  }

  if (startPeriod === 'afternoon' && endPeriod === 'morning') {
    return `${base} (PM→AM)`
  }

  if (startPeriod === 'afternoon') {
    return `${base} (desde PM)`
  }

  if (endPeriod === 'morning') {
    return `${base} (hasta AM)`
  }

  return base
}

export const getLeaveEventEndDate = (endDate: string) => addUtcDays(endDate, 1)

export const formatPeriodLabel = (periodId: string) => {
  const match = periodId.match(/^(\d{4})-(\d{2})$/)

  if (!match) {
    return periodId
  }

  const year = Number(match[1])
  const month = Number(match[2])

  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}
