import { resolveFormatLocale } from './locale-context'
import { DEFAULT_FORMAT_FALLBACK, type FormatRelativeOptions, type FormatValue } from './types'

const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1]
]

export const formatRelative = (value: FormatValue, options: FormatRelativeOptions = {}, locale?: FormatRelativeOptions['locale']): string => {
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK
  const date = value instanceof Date ? value : value == null || value === '' ? null : new Date(value)

  if (!date || Number.isNaN(date.getTime())) return fallback

  const now = options.now ?? new Date()
  const deltaSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const resolvedLocale = resolveFormatLocale(locale ?? options.locale)

  const formatter = new Intl.RelativeTimeFormat(resolvedLocale, {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long'
  })

  for (const [unit, secondsInUnit] of UNITS) {
    if (Math.abs(deltaSeconds) >= secondsInUnit || unit === 'second') {
      return formatter.format(Math.round(deltaSeconds / secondsInUnit), unit)
    }
  }

  return fallback
}
