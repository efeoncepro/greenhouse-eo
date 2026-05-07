import { resolveFormatLocale } from './locale-context'
import { DEFAULT_FORMAT_FALLBACK, type FormatLocale, type FormatNumberOptions } from './types'

export const formatNumber = (
  value: number | null | undefined,
  optionsOrLocale: FormatNumberOptions | FormatLocale = {},
  locale?: FormatNumberOptions['locale']
): string => {
  const options = typeof optionsOrLocale === 'string' ? {} : optionsOrLocale
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (value == null || !Number.isFinite(value)) return fallback

  const { locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(typeof optionsOrLocale === 'string' ? optionsOrLocale : (locale ?? optionLocale))

  return new Intl.NumberFormat(resolvedLocale, intlOptions).format(value)
}

export const formatInteger = (
  value: number | null | undefined,
  optionsOrLocale: FormatNumberOptions | FormatLocale = {},
  locale?: FormatNumberOptions['locale']
): string => {
  if (typeof optionsOrLocale === 'string') return formatNumber(value, { maximumFractionDigits: 0 }, optionsOrLocale)

  return formatNumber(value, { maximumFractionDigits: 0, ...optionsOrLocale }, locale)
}
