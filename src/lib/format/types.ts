import type { PlatformCurrency } from '@/lib/finance/currency-domain'

import type { Locale } from '@/lib/copy/types'

export type FormatLocale = Locale | 'pt-BR' | (string & {})

export const DEFAULT_FORMAT_FALLBACK = '—'
export const OPERATIONAL_TIME_ZONE = 'America/Santiago'

export const DISPLAY_CURRENCIES = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN', 'BRL'] as const

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number]
export type CurrencyCode = DisplayCurrency | PlatformCurrency | (string & {})

export type FormatValue = string | number | Date | null | undefined

export interface FormatOptions {
  locale?: FormatLocale
  fallback?: string
}

export interface FormatDateOptions extends Omit<Intl.DateTimeFormatOptions, 'timeZone'>, FormatOptions {
  timeZone?: string | null
}

export interface FormatDateTimeOptions extends Intl.DateTimeFormatOptions, FormatOptions {}

export interface FormatNumberOptions extends Intl.NumberFormatOptions, FormatOptions {}

export interface FormatCurrencyOptions extends Omit<Intl.NumberFormatOptions, 'style' | 'currency'>, FormatOptions {
  accounting?: boolean
  currencySymbol?: string
  currencySymbolSpacing?: string
}

export interface FormatPercentOptions extends Omit<Intl.NumberFormatOptions, 'style'>, FormatOptions {
  /**
   * `ratio` treats 0.25 as 25%. `percentage` treats 25 as 25%.
   */
  input?: 'ratio' | 'percentage'
}

export interface FormatRelativeOptions extends FormatOptions {
  now?: Date
  numeric?: Intl.RelativeTimeFormatNumeric
  style?: Intl.RelativeTimeFormatStyle
}
