import { resolveFormatLocale } from './locale-context'

import type { FormatLocale } from './types'

export const selectPlural = (
  value: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
  locale?: FormatLocale
): string => {
  const rule = new Intl.PluralRules(resolveFormatLocale(locale)).select(value)

  return forms[rule] ?? forms.other
}
