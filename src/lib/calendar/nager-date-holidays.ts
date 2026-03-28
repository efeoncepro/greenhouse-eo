import 'server-only'

export interface NagerDateHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}

export interface NagerDateHolidayFetchOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

const DEFAULT_NAGER_DATE_BASE_URL = 'https://date.nager.at/api/v3'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const assertHolidayDateKey = (value: string) => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new RangeError(`Invalid holiday date key: ${value}`)
  }
}

const normalizeCountryCode = (value: string) => {
  const normalized = value.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new RangeError(`Invalid country code: ${value}`)
  }

  return normalized
}

const toStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null
  }

  const items = value.filter(isNonEmptyString).map(item => item.trim())

  return items.length > 0 ? items : null
}

const normalizeHoliday = (holiday: Record<string, unknown>, fallbackCountryCode: string): NagerDateHoliday => {
  const date = typeof holiday.date === 'string' ? holiday.date : ''

  assertHolidayDateKey(date)

  const localName = isNonEmptyString(holiday.localName) ? holiday.localName.trim() : ''
  const name = isNonEmptyString(holiday.name) ? holiday.name.trim() : localName

  const countryCode = isNonEmptyString(holiday.countryCode)
    ? normalizeCountryCode(holiday.countryCode)
    : fallbackCountryCode

  return {
    date,
    localName,
    name,
    countryCode,
    fixed: Boolean(holiday.fixed),
    global: Boolean(holiday.global),
    counties: toStringArray(holiday.counties),
    launchYear: typeof holiday.launchYear === 'number' ? holiday.launchYear : null,
    types: toStringArray(holiday.types) ?? []
  }
}

export const fetchNagerDatePublicHolidays = async (
  year: number,
  countryCode: string,
  options: NagerDateHolidayFetchOptions = {}
): Promise<NagerDateHoliday[]> => {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError(`Invalid year: ${year}`)
  }

  const normalizedCountryCode = normalizeCountryCode(countryCode)
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = options.baseUrl ?? DEFAULT_NAGER_DATE_BASE_URL
  const url = `${baseUrl.replace(/\/$/, '')}/PublicHolidays/${year}/${normalizedCountryCode}`

  const response = await fetchImpl(url, {
    signal: options.signal
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Nager.Date holidays (${response.status} ${response.statusText})`)
  }

  const payload = await response.json()

  if (!Array.isArray(payload)) {
    throw new TypeError('Unexpected Nager.Date holiday payload.')
  }

  return payload.map(item => {
    if (!item || typeof item !== 'object') {
      throw new TypeError('Unexpected Nager.Date holiday item.')
    }

    return normalizeHoliday(item as Record<string, unknown>, normalizedCountryCode)
  })
}

export const loadNagerDateHolidayDateSet = async (
  year: number,
  countryCode: string,
  options: NagerDateHolidayFetchOptions = {}
) => {
  const holidays = await fetchNagerDatePublicHolidays(year, countryCode, options)

  return new Set(holidays.map(holiday => holiday.date))
}

