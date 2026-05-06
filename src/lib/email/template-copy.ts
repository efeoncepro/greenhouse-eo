import type { EmailLocaleInput } from './locale-resolver'

const isEnglishEmailLocale = (locale: EmailLocaleInput) => {
  const normalized = locale ? String(locale).trim() : ''

  return normalized === 'en' || normalized === 'en-US'
}

export const selectEmailTemplateCopy = <TCopy>(
  locale: EmailLocaleInput,
  platformCopy: TCopy,
  legacyEnglishCopy: TCopy
): TCopy => {
  return isEnglishEmailLocale(locale) ? legacyEnglishCopy : platformCopy
}
