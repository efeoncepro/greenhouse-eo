// TASK-990 — Money primitives (ADR GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1 §5.1).
// A MoneyAmount carries its currency + the declared precision for that currency.
// Rounding is half-up, applied ONCE at snapshot time, NEVER re-applied on read
// (ADR §5.1). CLP = 0 decimals, USD = 2, MXN = 2.

import type { FinanceCurrency } from '../contracts'

/** Fixed display/storage precision per finance_core currency (ADR §5.1). */
export const CURRENCY_PRECISION: Record<FinanceCurrency, number> = {
  CLP: 0,
  USD: 2,
  MXN: 2
}

export interface MoneyAmount {
  /** Canonical decimal string at the currency's declared precision. */
  amount: string
  currency: FinanceCurrency
  /** Mirror of CURRENCY_PRECISION[currency]; carried so consumers don't re-derive. */
  precision: number
}

/**
 * Half-up rounding to `precision` decimals, returned as a fixed-precision
 * string. Half-up (not banker's) is the ADR-declared rule. Uses a small epsilon
 * nudge to defeat binary float representation error (e.g. 1.005 → "1.01").
 */
export const roundHalfUp = (value: number, precision: number): string => {
  if (!Number.isFinite(value)) {
    throw new Error(`roundHalfUp: non-finite value ${value}`)
  }

  const factor = 10 ** precision
  const sign = value < 0 ? -1 : 1
  const scaled = Math.abs(value) * factor
  // Epsilon nudge guards against float artifacts at the .5 boundary.
  const rounded = Math.floor(scaled + 0.5 + Number.EPSILON * scaled)

  return ((sign * rounded) / factor).toFixed(precision)
}

/** Build a MoneyAmount, rounding the input to the currency's precision once. */
export const makeMoney = (amount: number | string, currency: FinanceCurrency): MoneyAmount => {
  const precision = CURRENCY_PRECISION[currency]
  const numeric = typeof amount === 'string' ? Number(amount) : amount

  if (!Number.isFinite(numeric)) {
    throw new Error(`makeMoney: non-finite amount "${amount}" for ${currency}`)
  }

  return { amount: roundHalfUp(numeric, precision), currency, precision }
}

/** Numeric view of a MoneyAmount for arithmetic (never persisted from this). */
export const moneyToNumber = (money: MoneyAmount): number => Number(money.amount)
