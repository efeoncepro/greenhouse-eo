import { resolveFormatLocale } from './locale-context'
import {
  DEFAULT_FORMAT_FALLBACK,
  OPERATIONAL_TIME_ZONE,
  type FormatDateOptions,
  type FormatDateTimeOptions,
  type FormatLocale,
  type FormatTimeOptions,
  type FormatValue
} from './types'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const dateOnlyToUtcNoon = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) return null

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

const toDate = (value: FormatValue): { date: Date | null; dateOnly: boolean } => {
  if (value == null || value === '') return { date: null, dateOnly: false }
  if (value instanceof Date) return { date: Number.isNaN(value.getTime()) ? null : value, dateOnly: false }

  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return { date: dateOnlyToUtcNoon(value), dateOnly: true }
  }

  const date = new Date(value)

  return { date: Number.isNaN(date.getTime()) ? null : date, dateOnly: false }
}

export const formatDate = (
  value: FormatValue,
  optionsOrLocale: FormatDateOptions | FormatLocale = {},
  locale?: FormatDateOptions['locale']
): string => {
  const { date, dateOnly } = toDate(value)
  const options = typeof optionsOrLocale === 'string' ? {} : optionsOrLocale
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (!date) return fallback

  const { locale: optionLocale, timeZone, ...intlOptions } = options

  delete intlOptions.fallback
  const resolvedLocale = resolveFormatLocale(typeof optionsOrLocale === 'string' ? optionsOrLocale : (locale ?? optionLocale))
  const resolvedTimeZone = dateOnly ? 'UTC' : (timeZone ?? undefined)
  const hasStyleShortcut = intlOptions.dateStyle != null || intlOptions.timeStyle != null

  return new Intl.DateTimeFormat(resolvedLocale, {
    ...(hasStyleShortcut
      ? {}
      : {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
    ...(resolvedTimeZone ? { timeZone: resolvedTimeZone } : {}),
    ...intlOptions
  }).format(date)
}

export const formatDateTime = (
  value: FormatValue,
  optionsOrLocale: FormatDateTimeOptions | FormatLocale = {},
  locale?: FormatDateTimeOptions['locale']
): string => {
  const { date } = toDate(value)
  const options = typeof optionsOrLocale === 'string' ? {} : optionsOrLocale
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (!date) return fallback

  const { locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(typeof optionsOrLocale === 'string' ? optionsOrLocale : (locale ?? optionLocale))
  const hasStyleShortcut = intlOptions.dateStyle != null || intlOptions.timeStyle != null

  return new Intl.DateTimeFormat(resolvedLocale, {
    ...(hasStyleShortcut
      ? {}
      : {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
    timeZone: OPERATIONAL_TIME_ZONE,
    ...intlOptions
  }).format(date)
}

export const formatTime = (
  value: FormatValue,
  optionsOrLocale: FormatTimeOptions | FormatLocale = {},
  locale?: FormatTimeOptions['locale']
): string => {
  const { date } = toDate(value)
  const options = typeof optionsOrLocale === 'string' ? {} : optionsOrLocale
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (!date) return fallback

  const { locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(typeof optionsOrLocale === 'string' ? optionsOrLocale : (locale ?? optionLocale))

  return new Intl.DateTimeFormat(resolvedLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: OPERATIONAL_TIME_ZONE,
    ...intlOptions
  }).format(date)
}

export const formatISODateKey = (value: FormatValue, timeZone = OPERATIONAL_TIME_ZONE): string => {
  const { date } = toDate(value)

  if (!date) return ''

  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone
  }).format(date)
}
