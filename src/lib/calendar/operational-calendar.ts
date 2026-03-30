export const DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE = 'America/Santiago'
export const DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE = 'CL'
export const DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS = 5

export type DateLike = string | Date

export interface OperationalCalendarContextInput {
  timezone?: string | null
  countryCode?: string | null
  holidayCalendarCode?: string | null
  holidayDates?: Iterable<string> | null
  closeWindowBusinessDays?: number | null
}

export interface OperationalCalendarContext {
  timezone: string
  countryCode: string
  holidayCalendarCode: string | null
  holidayDates: ReadonlySet<string>
  closeWindowBusinessDays: number
}

export interface OperationalPayrollMonthResolution {
  calendarYear: number
  calendarMonth: number
  calendarMonthKey: string
  operationalYear: number
  operationalMonth: number
  operationalMonthKey: string
  inCloseWindow: boolean
  businessDaysElapsed: number
  businessDaysRemaining: number
  closeWindowBusinessDays: number
}

type CalendarDateParts = {
  year: number
  month: number
  day: number
  key: string
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const toDateKey = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const toMonthKey = (year: number, month: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`

const buildCalendarDateParts = (year: number, month: number, day: number): CalendarDateParts => ({
  year,
  month,
  day,
  key: toDateKey(year, month, day)
})

const parseDateOnlyString = (value: string): CalendarDateParts | null => {
  const match = value.match(DATE_ONLY_PATTERN)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  const candidate = new Date(Date.UTC(year, month - 1, day))

  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return null
  }

  return buildCalendarDateParts(year, month, day)
}

const getDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

const resolveDateParts = (value: DateLike, timeZone: string): CalendarDateParts => {
  if (typeof value === 'string') {
    const dateOnlyParts = parseDateOnlyString(value)

    if (dateOnlyParts) {
      return dateOnlyParts
    }

    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
      throw new RangeError(`Unable to parse calendar date value: ${value}`)
    }

    return resolveDateParts(parsed, timeZone)
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError('Unable to parse calendar date value.')
  }

  const formatter = getDateFormatter(timeZone)
  const parts = formatter.formatToParts(value)

  const year = Number(parts.find(part => part.type === 'year')?.value)
  const month = Number(parts.find(part => part.type === 'month')?.value)
  const day = Number(parts.find(part => part.type === 'day')?.value)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new RangeError(`Unable to resolve local calendar date in timezone ${timeZone}.`)
  }

  return buildCalendarDateParts(year, month, day)
}

const compareCalendarDates = (left: CalendarDateParts, right: CalendarDateParts) => {
  if (left.year !== right.year) {
    return left.year - right.year
  }

  if (left.month !== right.month) {
    return left.month - right.month
  }

  return left.day - right.day
}

const addCalendarDays = (value: CalendarDateParts, offsetDays: number): CalendarDateParts => {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day))

  date.setUTCDate(date.getUTCDate() + offsetDays)

  return buildCalendarDateParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
}

const previousMonth = (value: CalendarDateParts): CalendarDateParts => {
  if (value.month === 1) {
    return buildCalendarDateParts(value.year - 1, 12, 1)
  }

  return buildCalendarDateParts(value.year, value.month - 1, 1)
}

const firstDefinedString = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value
    }
  }

  return null
}

const normalizeHolidayDates = (holidayDates: Iterable<string> | null | undefined) => {
  const normalized = new Set<string>()

  if (!holidayDates) {
    return normalized
  }

  for (const date of holidayDates) {
    const parsed = parseDateOnlyString(date)

    if (!parsed) {
      throw new RangeError(`Invalid holiday date key: ${date}`)
    }

    normalized.add(parsed.key)
  }

  return normalized
}

const mergeHolidayDates = (...holidayDateSources: Array<Iterable<string> | null | undefined>) => {
  const merged = new Set<string>()

  for (const source of holidayDateSources) {
    for (const holidayDate of normalizeHolidayDates(source)) {
      merged.add(holidayDate)
    }
  }

  return merged
}

const resolveCloseWindowBusinessDays = (
  tenant: OperationalCalendarContextInput | null | undefined,
  payrollPolicy: OperationalCalendarContextInput | null | undefined,
  fallback: OperationalCalendarContextInput | null | undefined
) => {
  const sources = [tenant, payrollPolicy, fallback]

  for (const source of sources) {
    if (source?.closeWindowBusinessDays == null) {
      continue
    }

    const value = Number(source.closeWindowBusinessDays)

    if (!Number.isInteger(value) || value < 1) {
      throw new RangeError('closeWindowBusinessDays must be a positive integer.')
    }

    return value
  }

  return DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS
}

export const resolveOperationalCalendarContext = (
  tenant?: OperationalCalendarContextInput | null,
  payrollPolicy?: OperationalCalendarContextInput | null,
  fallback?: OperationalCalendarContextInput | null
): OperationalCalendarContext => {
  const timezone = firstDefinedString(
    tenant?.timezone,
    payrollPolicy?.timezone,
    fallback?.timezone
  ) ?? DEFAULT_OPERATIONAL_CALENDAR_TIMEZONE

  const countryCode = firstDefinedString(
    tenant?.countryCode,
    payrollPolicy?.countryCode,
    fallback?.countryCode
  ) ?? DEFAULT_OPERATIONAL_CALENDAR_COUNTRY_CODE

  const holidayCalendarCode = firstDefinedString(
    tenant?.holidayCalendarCode,
    payrollPolicy?.holidayCalendarCode,
    fallback?.holidayCalendarCode
  )

  const holidayDates = mergeHolidayDates(
    fallback?.holidayDates,
    payrollPolicy?.holidayDates,
    tenant?.holidayDates
  )

  return {
    timezone,
    countryCode,
    holidayCalendarCode,
    holidayDates,
    closeWindowBusinessDays: resolveCloseWindowBusinessDays(tenant, payrollPolicy, fallback)
  }
}

const getCalendarDate = (value: DateLike, timeZone: string) => resolveDateParts(value, timeZone)

const isWeekend = (calendarDate: CalendarDateParts) => {
  const dayOfWeek = new Date(Date.UTC(calendarDate.year, calendarDate.month - 1, calendarDate.day)).getUTCDay()

  return dayOfWeek === 0 || dayOfWeek === 6
}

const isBusinessCalendarDate = (
  calendarDate: CalendarDateParts,
  context: OperationalCalendarContext
) => !isWeekend(calendarDate) && !context.holidayDates.has(calendarDate.key)

export const countBusinessDays = (
  startDate: DateLike,
  endDate: DateLike,
  options?: OperationalCalendarContextInput | null
) => {
  const context = resolveOperationalCalendarContext(options ?? null, null, null)
  const start = getCalendarDate(startDate, context.timezone)
  const end = getCalendarDate(endDate, context.timezone)

  if (compareCalendarDates(start, end) > 0) {
    throw new RangeError('startDate must be earlier than or equal to endDate.')
  }

  let count = 0
  let current = start

  while (compareCalendarDates(current, end) <= 0) {
    if (isBusinessCalendarDate(current, context)) {
      count++
    }

    current = addCalendarDays(current, 1)
  }

  return count
}

export const getOperationalDateKey = (
  referenceDate: DateLike,
  options?: OperationalCalendarContextInput | null
) => {
  const context = resolveOperationalCalendarContext(options ?? null, null, null)

  return getCalendarDate(referenceDate, context.timezone).key
}

export const getLastBusinessDayOfMonth = (
  year: number,
  month: number,
  options?: OperationalCalendarContextInput | null
) => {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError(`Invalid year: ${year}`)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${month}`)
  }

  const context = resolveOperationalCalendarContext(options ?? null, null, null)

  let candidate = buildCalendarDateParts(
    year,
    month,
    new Date(Date.UTC(year, month, 0)).getUTCDate()
  )

  while (!isBusinessCalendarDate(candidate, context)) {
    candidate = addCalendarDays(candidate, -1)
  }

  return candidate.key
}

export const isLastBusinessDayOfMonth = (
  referenceDate: DateLike,
  options?: OperationalCalendarContextInput | null
) => {
  const context = resolveOperationalCalendarContext(options ?? null, null, null)
  const localDate = getCalendarDate(referenceDate, context.timezone)

  return localDate.key === getLastBusinessDayOfMonth(localDate.year, localDate.month, context)
}

export const isWithinPayrollCloseWindow = (
  referenceDate: DateLike,
  closeWindowBusinessDays = DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS,
  options?: OperationalCalendarContextInput | null
) => {
  const context = resolveOperationalCalendarContext(options ?? null, null, null)

  const resolvedCloseWindow = Number.isInteger(closeWindowBusinessDays) && closeWindowBusinessDays > 0
    ? closeWindowBusinessDays
    : context.closeWindowBusinessDays

  const localDate = getCalendarDate(referenceDate, context.timezone)
  const monthStart = buildCalendarDateParts(localDate.year, localDate.month, 1)

  const businessDaysElapsed = countBusinessDays(monthStart.key, localDate.key, {
    timezone: context.timezone,
    countryCode: context.countryCode,
    holidayCalendarCode: context.holidayCalendarCode,
    holidayDates: context.holidayDates,
    closeWindowBusinessDays: resolvedCloseWindow
  })

  return businessDaysElapsed <= resolvedCloseWindow
}

export const getOperationalPayrollMonth = (
  referenceDate: DateLike,
  options?: OperationalCalendarContextInput | null
): OperationalPayrollMonthResolution => {
  const context = resolveOperationalCalendarContext(options ?? null, null, null)
  const localDate = getCalendarDate(referenceDate, context.timezone)
  const calendarMonth = buildCalendarDateParts(localDate.year, localDate.month, 1)

  const businessDaysElapsed = countBusinessDays(calendarMonth.key, localDate.key, {
    timezone: context.timezone,
    countryCode: context.countryCode,
    holidayCalendarCode: context.holidayCalendarCode,
    holidayDates: context.holidayDates,
    closeWindowBusinessDays: context.closeWindowBusinessDays
  })

  const inCloseWindow = businessDaysElapsed <= context.closeWindowBusinessDays
  const operationalMonth = inCloseWindow ? previousMonth(calendarMonth) : calendarMonth

  return {
    calendarYear: localDate.year,
    calendarMonth: localDate.month,
    calendarMonthKey: toMonthKey(calendarMonth.year, calendarMonth.month),
    operationalYear: operationalMonth.year,
    operationalMonth: operationalMonth.month,
    operationalMonthKey: toMonthKey(operationalMonth.year, operationalMonth.month),
    inCloseWindow,
    businessDaysElapsed,
    businessDaysRemaining: inCloseWindow ? Math.max(0, context.closeWindowBusinessDays - businessDaysElapsed) : 0,
    closeWindowBusinessDays: context.closeWindowBusinessDays
  }
}
