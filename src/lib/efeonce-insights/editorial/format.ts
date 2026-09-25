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

/**
 * TASK-1888 — variación de una métrica que YA es un porcentaje (OTD%, FTR%, CTR…): se dice en PUNTOS PORCENTUALES
 * («+1,8 pp»), nunca como variación relativa. Caso Sky 2026-09-25: OTD 80,1 % → 81,9 % salió «+2,2 %» (variación
 * relativa), que un lector lee como «subió 2,2 puntos» cuando subió 1,8. La variación relativa queda para métricas absolutas (conteos, visitas…).
 */
export const formatDeltaPoints = (current: number, previous: number, locale: string): string => {
  const delta = current - previous
  // Una variación real bajo 0,05 pp se imprimiría «0,0 pp» junto a dos cifras que se ven distintas (Berel, CTR
  // 1,83 % vs 1,87 %, 2026-09-25): con dos decimales dice lo que pasó («-0,04 pp»). Cero exacto sigue siendo «0,0 pp».
  const digits = delta !== 0 && Math.abs(delta) < 0.05 ? 2 : 1
  const text = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: 'exceptZero' }).format(delta)

  return `${text} pp`
}

/** Variación que el documento imprime para una unidad: pp si la métrica es porcentaje, relativa si no. */
export const formatDeltaForUnit = (current: number, previous: number, unit: EvidenceUnit, locale: string): string | null =>
  unit === 'percent' ? formatDeltaPoints(current, previous, locale) : formatDeltaPercent(current, previous, locale)

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
        // Los planes sellados antes de TASK-1888 escribieron la variación relativa también para porcentajes: se sigue
        // admitiendo para que validen igual; los nuevos la escriben en pp.
        if (fact.unit === 'percent') allowed.add(formatDeltaPoints(fact.value, comparison.value, locale))
      }
    }
  }

  return allowed
}

/**
 * Extrae tokens numéricos tal como aparecen (con separadores, signo, %, pp, #, US$). Una fecha ISO
 * (`AAAA-MM` o `AAAA-MM-DD`) es UN token: sin esa alternativa, «2026-08» se partía en «2026» y
 * «-08», y el mes se leía como un número negativo que ningún hecho respalda.
 */
export const extractNumberTokens = (text: string): string[] => {
  const tokens: string[] = []
  const pattern = /\d{4}-\d{2}(?:-\d{2})?(?!\d)|(?:US\$ |\$ |#)?[+\-−]?\d[\d.,]*(?: %| pp\b)?/g

  // Un separador al final del token es puntuación de la frase («1.000,»), no parte de la cifra.
  for (const match of text.matchAll(pattern)) tokens.push(match[0].replace(/[.,]+$/, ''))

  return tokens
}
