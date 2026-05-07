import { DEFAULT_LOCALE } from '@/lib/copy/types'

import type { FormatLocale } from './types'

export const DEFAULT_FORMAT_LOCALE: FormatLocale = DEFAULT_LOCALE

export const getDefaultFormatLocale = (): FormatLocale => DEFAULT_FORMAT_LOCALE

export const resolveFormatLocale = (locale?: FormatLocale | null): FormatLocale => {
  const candidate = locale ?? getDefaultFormatLocale()

  try {
    const [canonical] = Intl.getCanonicalLocales(candidate)

    return (canonical ?? DEFAULT_FORMAT_LOCALE) as FormatLocale
  } catch {
    return DEFAULT_FORMAT_LOCALE
  }
}
