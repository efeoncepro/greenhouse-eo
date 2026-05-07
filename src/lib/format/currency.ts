import { resolveFormatLocale } from './locale-context'
import { DEFAULT_FORMAT_FALLBACK, type CurrencyCode, type FormatCurrencyOptions, type FormatLocale } from './types'

const ZERO_DECIMAL_CURRENCIES = new Set<CurrencyCode>(['CLP', 'COP'])

export const formatCurrency = (
  amount: number | null | undefined,
  currency: CurrencyCode,
  optionsOrLocale: FormatCurrencyOptions | FormatLocale = {},
  locale?: FormatCurrencyOptions['locale']
): string => {
  const options = typeof optionsOrLocale === 'string' ? {} : optionsOrLocale
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (amount == null || !Number.isFinite(amount)) return fallback

  const { accounting, currencySymbol, currencySymbolSpacing = '', locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(typeof optionsOrLocale === 'string' ? optionsOrLocale : (locale ?? optionLocale))
  const normalizedCurrency = currency.toUpperCase() as CurrencyCode
  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)
  const defaultFractionDigits = zeroDecimal ? 0 : 2
  const requestedMinimumFractionDigits = intlOptions.minimumFractionDigits
  const requestedMaximumFractionDigits = intlOptions.maximumFractionDigits
  const maximumFractionDigits = requestedMaximumFractionDigits ?? Math.max(defaultFractionDigits, requestedMinimumFractionDigits ?? 0)
  const minimumFractionDigits = requestedMinimumFractionDigits ?? Math.min(defaultFractionDigits, maximumFractionDigits)

  const fractionOptions = {
    minimumFractionDigits,
    maximumFractionDigits,
    ...intlOptions
  }

  if (currencySymbol != null) {
    const sign = amount < 0 ? '-' : ''
    const absoluteAmount = Math.abs(amount)
    const formattedAmount = new Intl.NumberFormat(resolvedLocale, fractionOptions).format(absoluteAmount)

    return `${sign}${currencySymbol}${currencySymbolSpacing}${formattedAmount}`
  }

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencySign: accounting ? 'accounting' : 'standard',
      ...fractionOptions
    }).format(amount)
  } catch {
    const formattedAmount = new Intl.NumberFormat(resolvedLocale, fractionOptions).format(amount)

    return `${normalizedCurrency} ${formattedAmount}`
  }
}

export const formatAccountingCurrency = (
  amount: number | null | undefined,
  currency: CurrencyCode,
  optionsOrLocale: FormatCurrencyOptions | FormatLocale = {},
  locale?: FormatCurrencyOptions['locale']
): string => {
  if (typeof optionsOrLocale === 'string') return formatCurrency(amount, currency, { accounting: true }, optionsOrLocale)

  return formatCurrency(amount, currency, { accounting: true, ...optionsOrLocale }, locale)
}
