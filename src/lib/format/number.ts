import { resolveFormatLocale } from './locale-context'
import { DEFAULT_FORMAT_FALLBACK, type FormatNumberOptions } from './types'

export const formatNumber = (value: number | null | undefined, options: FormatNumberOptions = {}, locale?: FormatNumberOptions['locale']): string => {
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (value == null || !Number.isFinite(value)) return fallback

  const { locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(locale ?? optionLocale)

  return new Intl.NumberFormat(resolvedLocale, intlOptions).format(value)
}

export const formatInteger = (value: number | null | undefined, options: FormatNumberOptions = {}, locale?: FormatNumberOptions['locale']): string =>
  formatNumber(value, { maximumFractionDigits: 0, ...options }, locale)
