/**
 * TASK-1845 — formato determinista de cifras por locale (browser-safe, sólo `Intl`). Es la
 * ÚNICA forma de escribir un número en texto/tabla del plan: la validación reconstruye las
 * cifras permitidas con estas mismas funciones y rechaza cualquier otra.
 */

import type { EvidenceFactV1, EvidenceUnit } from '../contracts/evidence'

const UNIT_DIGITS: Record<EvidenceUnit, number> = {
  count: 0,
  percent: 1,
  ratio: 2,
  position: 1,
  score: 0,
  days: 1,
  visits_estimated: 0,
  usd: 0,
  clp: 0
}

export const formatFactValue = (value: number | null, unit: EvidenceUnit, locale: string): string => {
  if (value === null) return '—'

  const digits = UNIT_DIGITS[unit]
  const text = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

  switch (unit) {
    case 'percent':
      return `${text} %`
    case 'position':
      return `#${text}`
    case 'usd':
      return `US$ ${text}`
    case 'clp':
      return `$ ${text}`
    default:
      return text
  }
}

export const formatDeltaPercent = (current: number, previous: number, locale: string): string | null => {
  if (previous === 0) return null

  const delta = ((current - previous) / Math.abs(previous)) * 100
  const text = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(delta)

  return `${text} %`
}

/** Cifras que una claim puede contener si referencia estos hechos (valores, num/den y delta). */
export const allowedNumbersForFacts = (facts: EvidenceFactV1[], byId: Map<string, EvidenceFactV1>, locale: string): Set<string> => {
  const allowed = new Set<string>()

  for (const fact of facts) {
    allowed.add(formatFactValue(fact.value, fact.unit, locale))
    if (fact.numerator !== null) allowed.add(formatFactValue(fact.numerator, 'count', locale))
    if (fact.denominator !== null) allowed.add(formatFactValue(fact.denominator, 'count', locale))
    if (fact.coverage.populationSize !== null) allowed.add(formatFactValue(fact.coverage.populationSize, 'count', locale))

    const comparison = fact.comparisonFactId ? byId.get(fact.comparisonFactId) : null

    if (comparison) {
      allowed.add(formatFactValue(comparison.value, comparison.unit, locale))

      if (fact.value !== null && comparison.value !== null) {
        const delta = formatDeltaPercent(fact.value, comparison.value, locale)

        if (delta) allowed.add(delta)
        allowed.add(formatFactValue(fact.value - comparison.value, fact.unit, locale))
      }
    }
  }

  return allowed
}

/** Extrae tokens numéricos tal como aparecen (con separadores, signo, %, #, US$). */
export const extractNumberTokens = (text: string): string[] => {
  const tokens: string[] = []
  const pattern = /(?:US\$ |\$ |#)?[+\-−]?\d[\d.,]*(?: %)?/g

  // Un separador al final del token es puntuación de la frase («1.000,»), no parte de la cifra.
  for (const match of text.matchAll(pattern)) tokens.push(match[0].replace(/[.,]+$/, ''))

  return tokens
}
