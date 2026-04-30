export const GREENHOUSE_BUSINESS_TIMEZONE = 'America/Santiago'

export type BusinessDateParts = {
  year: number
  month: number
  day: number
}

const DAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

const getDayFormatter = (timeZone: string) => {
  const existing = DAY_FORMATTERS.get(timeZone)

  if (existing) {
    return existing
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  DAY_FORMATTERS.set(timeZone, formatter)

  return formatter
}

const normalizeDateInput = (at?: Date | string | number) => {
  const normalized = at instanceof Date
    ? new Date(at.getTime())
    : new Date(at ?? Date.now())

  if (Number.isNaN(normalized.getTime())) {
    return null
  }

  return normalized
}

export const getDatePartsInTimeZone = ({
  at,
  timeZone = GREENHOUSE_BUSINESS_TIMEZONE
}: {
  at?: Date | string | number
  timeZone?: string
}): BusinessDateParts | null => {
  const normalized = normalizeDateInput(at)

  if (!normalized) {
    return null
  }

  const parts = getDayFormatter(timeZone).formatToParts(normalized)

  return {
    year: Number(parts.find(part => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find(part => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find(part => part.type === 'day')?.value ?? '1')
  }
}

export const getSantiagoDateParts = (at?: Date | string | number) =>
  getDatePartsInTimeZone({ at, timeZone: GREENHOUSE_BUSINESS_TIMEZONE })

export const getMonthProgressRatio = ({
  periodYear,
  periodMonth,
  at,
  timeZone = GREENHOUSE_BUSINESS_TIMEZONE,
  minimumRatio = 0.05
}: {
  periodYear: number
  periodMonth: number
  at?: Date | string | number
  timeZone?: string
  minimumRatio?: number
}) => {
  const today = getDatePartsInTimeZone({ at, timeZone })

  if (!today || today.year !== periodYear || today.month !== periodMonth) {
    return null
  }

  const totalDaysInMonth = new Date(Date.UTC(periodYear, periodMonth, 0)).getUTCDate()

  return Math.min(1, Math.max(minimumRatio, today.day / totalDaysInMonth))
}
