/**
 * Pure currency comparison helpers — importable from both server and client code.
 * Computes consolidated CLP/USD equivalents and period-over-period deltas.
 *
 * @module finance/currency-comparison
 */

// ── Types ──

export interface CurrencyTotals {
  grossByCurrency: Record<string, number>
  netByCurrency: Record<string, number>
}

export interface ConsolidatedEquivalent {
  grossClp: number
  netClp: number
  grossUsd: number
  netUsd: number
  fxRate: number
}

export interface CurrencyDelta {
  grossDeltaPct: number | null
  netDeltaPct: number | null
  compareLabel: string
  grossReference: number | null
  netReference: number | null
}

// ── Helpers ──

const roundCurrency = (n: number) => Math.round(n * 100) / 100

/**
 * Consolidate multi-currency totals into CLP and USD equivalents.
 * Uses the canonical finance conversion pattern:
 *   CLP total = USD × usdToClp + CLP
 *   USD total = USD + CLP × clpToUsd
 *
 * Returns null if no USD amounts are present (single-currency, no conversion needed).
 */
export const consolidateCurrencyEquivalents = (
  totals: CurrencyTotals,
  usdToClp: number
): ConsolidatedEquivalent | null => {
  const grossUsd = totals.grossByCurrency.USD ?? 0
  const grossClp = totals.grossByCurrency.CLP ?? 0
  const netUsd = totals.netByCurrency.USD ?? 0
  const netClp = totals.netByCurrency.CLP ?? 0

  if (grossUsd <= 0 && netUsd <= 0) return null
  if (usdToClp <= 0) return null

  const clpToUsd = 1 / usdToClp

  return {
    grossClp: Math.round(grossUsd * usdToClp + grossClp),
    netClp: Math.round(netUsd * usdToClp + netClp),
    grossUsd: roundCurrency(grossUsd + grossClp * clpToUsd),
    netUsd: roundCurrency(netUsd + netClp * clpToUsd),
    fxRate: usdToClp
  }
}

/**
 * Compute period-over-period delta between current and comparison totals.
 *
 * @param currentClp  - Current period consolidated CLP (gross and net)
 * @param compareTotals - Comparison period raw currency totals
 * @param usdToClp - Exchange rate for converting comparison USD → CLP
 * @param compareLabel - Human label for the comparison (e.g., "vs oficial", "vs 2026-03")
 */
export const computeCurrencyDelta = (
  current: { grossClp: number; netClp: number },
  compareTotals: CurrencyTotals,
  usdToClp: number,
  compareLabel: string
): CurrencyDelta => {
  const compareGrossClp = Object.entries(compareTotals.grossByCurrency).reduce(
    (sum, [cur, amt]) => sum + (cur === 'USD' ? amt * usdToClp : amt), 0
  )

  const compareNetClp = Object.entries(compareTotals.netByCurrency).reduce(
    (sum, [cur, amt]) => sum + (cur === 'USD' ? amt * usdToClp : amt), 0
  )

  const grossDeltaPct = compareGrossClp > 0
    ? Math.round(((current.grossClp - compareGrossClp) / compareGrossClp) * 100)
    : null

  const netDeltaPct = compareNetClp > 0
    ? Math.round(((current.netClp - compareNetClp) / compareNetClp) * 100)
    : null

  return {
    grossDeltaPct,
    netDeltaPct,
    compareLabel,
    grossReference: compareGrossClp > 0 ? Math.round(compareGrossClp) : null,
    netReference: compareNetClp > 0 ? Math.round(compareNetClp) : null
  }
}

/**
 * Determine trend direction for payroll deltas.
 * For payroll costs, an increase is NEGATIVE (higher cost),
 * a decrease is POSITIVE (lower cost).
 */
export const payrollTrendDirection = (deltaPct: number | null | undefined): 'positive' | 'negative' | 'neutral' | undefined => {
  if (deltaPct == null) return undefined
  if (deltaPct === 0) return 'neutral'

  // Higher payroll = negative trend (cost increase)
  return deltaPct > 0 ? 'negative' : 'positive'
}

/**
 * Format a delta percentage as a trend label.
 * Example: formatDeltaLabel(5, "vs 2026-03") → "5% vs 2026-03"
 */
export const formatDeltaLabel = (deltaPct: number | null | undefined, compareLabel: string): string | undefined => {
  if (deltaPct == null) return undefined

  return `${Math.abs(deltaPct)}% ${compareLabel}`
}
