import 'server-only'

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/lib/copy'

export type EmailTemplateLocale = 'es' | 'en'
export type EmailLocaleInput = Locale | EmailTemplateLocale | string | null | undefined

const EMAIL_LOCALE_BY_PLATFORM_LOCALE: Record<Locale, EmailTemplateLocale> = {
  'es-CL': 'es',
  'en-US': 'en'
}

const PLATFORM_LOCALE_BY_EMAIL_LOCALE: Record<EmailTemplateLocale, Locale> = {
  es: 'es-CL',
  en: 'en-US'
}

const isSupportedLocale = (value: string): value is Locale => {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export const resolveEmailLocale = (input?: EmailLocaleInput): Locale => {
  if (!input) return DEFAULT_LOCALE

  const normalized = String(input).trim()

  if (isSupportedLocale(normalized)) return normalized
  if (normalized === 'es' || normalized === 'es-CL') return 'es-CL'
  if (normalized === 'en' || normalized === 'en-US') return 'en-US'

  return DEFAULT_LOCALE
}

export const toEmailTemplateLocale = (input?: EmailLocaleInput): EmailTemplateLocale => {
  return EMAIL_LOCALE_BY_PLATFORM_LOCALE[resolveEmailLocale(input)]
}

export const toPlatformLocale = (input?: EmailLocaleInput): Locale => {
  const normalized = input ? String(input).trim() : ''

  if (normalized === 'es' || normalized === 'en') {
    return PLATFORM_LOCALE_BY_EMAIL_LOCALE[normalized]
  }

  return resolveEmailLocale(input)
}
