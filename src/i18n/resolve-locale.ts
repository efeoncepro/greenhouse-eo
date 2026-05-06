import { match } from '@formatjs/intl-localematcher'

import { defaultLocale, locales, normalizeLocale } from './locales'

import type { Locale } from '@/lib/copy'

type LocaleResolutionInput = {
  cookieLocale?: string | null
  acceptLanguage?: string | null
}

const parseAcceptLanguage = (header: string | null | undefined): string[] => {
  if (!header) return []

  return header
    .split(',')
    .map(part => {
      const [languageRange, ...params] = part.trim().split(';')
      const qParam = params.find(param => param.trim().startsWith('q='))
      const weight = qParam ? Number(qParam.trim().slice(2)) : 1

      return {
        languageRange: languageRange.trim(),
        weight: Number.isFinite(weight) ? weight : 0
      }
    })
    .filter(entry => entry.languageRange && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map(entry => entry.languageRange)
}

export const resolveLocaleFromRequest = ({
  cookieLocale,
  acceptLanguage
}: LocaleResolutionInput = {}): Locale => {
  const cookieMatch = normalizeLocale(cookieLocale)

  if (cookieMatch) return cookieMatch

  const acceptedLocales = parseAcceptLanguage(acceptLanguage)

  if (acceptedLocales.length === 0) return defaultLocale

  try {
    return match(acceptedLocales, locales, defaultLocale) as Locale
  } catch {
    return defaultLocale
  }
}

export const resolveLocaleFromHeader = (acceptLanguage?: string | null): Locale => {
  return resolveLocaleFromRequest({ acceptLanguage })
}
