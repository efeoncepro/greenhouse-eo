import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/copy'

import type { Locale } from '@/lib/copy'

export const GH_LOCALE_COOKIE = 'gh_locale'

export const locales = SUPPORTED_LOCALES

export const defaultLocale = DEFAULT_LOCALE

export const localeDirections: Record<Locale, 'ltr'> = {
  'es-CL': 'ltr',
  'en-US': 'ltr'
}

export const isSupportedLocale = (value: string | null | undefined): value is Locale => {
  return Boolean(value && (SUPPORTED_LOCALES as readonly string[]).includes(value))
}

export const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) return null

  const normalized = value.trim()

  if (isSupportedLocale(normalized)) return normalized
  if (normalized === 'es') return 'es-CL'
  if (normalized === 'en') return 'en-US'

  try {
    const [canonical] = Intl.getCanonicalLocales(normalized)

    if (isSupportedLocale(canonical)) return canonical
  } catch {
    return null
  }

  return null
}
