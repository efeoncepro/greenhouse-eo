import { resolveFormatLocale } from './locale-context'
import { DEFAULT_FORMAT_FALLBACK, type CurrencyCode, type FormatCurrencyOptions } from './types'

const ZERO_DECIMAL_CURRENCIES = new Set<CurrencyCode>(['CLP', 'COP'])

export const formatCurrency = (
  amount: number | null | undefined,
  currency: CurrencyCode,
  options: FormatCurrencyOptions = {},
  locale?: FormatCurrencyOptions['locale']
): string => {
  const fallback = options.fallback ?? DEFAULT_FORMAT_FALLBACK

  if (amount == null || !Number.isFinite(amount)) return fallback

  const { accounting, currencySymbol, currencySymbolSpacing = '', locale: optionLocale, ...intlOptions } = options

  delete intlOptions.fallback

  const resolvedLocale = resolveFormatLocale(locale ?? optionLocale)
  const normalizedCurrency = currency.toUpperCase() as CurrencyCode
  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)

  const fractionOptions = {
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
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
  options: FormatCurrencyOptions = {},
  locale?: FormatCurrencyOptions['locale']
): string => formatCurrency(amount, currency, { accounting: true, ...options }, locale)
