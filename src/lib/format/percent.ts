import { resolveFormatLocale } from './locale-context'
import { DEFAULT_FORMAT_FALLBACK, type FormatPercentOptions } from './types'

export const formatPercent = (
  value: number | null | undefined,
  options: FormatPercentOptions = {},
  locale?: FormatPercentOptions['locale']
): string => {
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (value == null || !Number.isFinite(value)) return fallback

  const { input = 'ratio', locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(locale ?? optionLocale)
  const normalized = input === 'percentage' ? value / 100 : value

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...intlOptions
  }).format(normalized)
}
