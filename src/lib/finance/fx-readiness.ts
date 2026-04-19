import 'server-only'

import { query } from '@/lib/db'

import type { CurrencyDomain, FxReadiness } from './currency-domain'
import {
  CURRENCY_DOMAIN_SUPPORT,
  FX_STALENESS_THRESHOLD_DAYS,
  isSupportedCurrencyForDomain
} from './currency-domain'
import { allowsUsdComposition, getCurrencyRegistryEntry } from './currency-registry'

// Canonical FX readiness resolver. Every consumer (pricing engine, quote
// simulator, future TASK-466 UI, admin diagnostics) goes through THIS
// function. Do not re-implement the direct/inverse/USD-composition chain
// anywhere else.
//
// Contract:
//   1. Same-currency → supported, rate=1 immediately.
//   2. Domain gate → if either side is not in `CURRENCY_DOMAIN_SUPPORT[domain]`,
//      return `unsupported` without even touching the DB.
//   3. Direct lookup with `rate_date <= refDate` — most recent row wins.
//   4. Inverse lookup (swap from/to) + invert — if registry allows.
//   5. USD composition (`from → USD → to`) — if registry allows and both
//      legs resolve.
//   6. Classify state by age vs domain threshold.
//
// The resolver NEVER throws on "no rate"; it returns a readiness object so
// callers can make a policy decision (soft warn, hard block, degrade).

export interface ResolveFxReadinessInput {
  fromCurrency: string
  toCurrency: string
  rateDate?: string | null
  domain: CurrencyDomain
}

interface ExchangeRateRow extends Record<string, unknown> {
  rate: string | number
  rate_date: string | Date
  source: string | null
}

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) && n > 0 ? n : null
}

const toIsoDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const ageInDays = (isoDate: string, refDate: string): number => {
  const a = new Date(`${isoDate}T00:00:00Z`).getTime()
  const b = new Date(`${refDate}T00:00:00Z`).getTime()

  return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)))
}

const fetchDirectRow = async (
  from: string,
  to: string,
  refDate: string
): Promise<ExchangeRateRow | null> => {
  const rows = await query<ExchangeRateRow>(
    `SELECT rate, rate_date, source
       FROM greenhouse_finance.exchange_rates
      WHERE from_currency = $1 AND to_currency = $2 AND rate_date <= $3
      ORDER BY rate_date DESC
      LIMIT 1`,
    [from.toUpperCase(), to.toUpperCase(), refDate]
  )

  return rows[0] ?? null
}

const buildMessage = (
  from: string,
  to: string,
  state: FxReadiness['state'],
  ageDays: number | null,
  threshold: number,
  composedViaUsd: boolean
): string => {
  if (state === 'unsupported') {
    return `El par ${from}→${to} no está habilitado para este dominio.`
  }

  if (state === 'temporarily_unavailable') {
    return `No hay tasa disponible para ${from}→${to}. Verifica si el sync automático corrió o sube una tasa manual.`
  }

  if (state === 'supported_but_stale') {
    return `La tasa ${from}→${to} es de hace ${ageDays} días (umbral ${threshold}). Actualiza antes de snapshot client-facing.`
  }

  const composedNote = composedViaUsd ? ' Derivada por composición vía USD.' : ''

  return `Tasa ${from}→${to} disponible (hace ${ageDays ?? 0} días).${composedNote}`
}

export const resolveFxReadiness = async ({
  fromCurrency,
  toCurrency,
  rateDate,
  domain
}: ResolveFxReadinessInput): Promise<FxReadiness> => {
  const from = fromCurrency.toUpperCase()
  const to = toCurrency.toUpperCase()
  const refDate = rateDate ?? todayIso()
  const threshold = FX_STALENESS_THRESHOLD_DAYS[domain]

  // 1. Same-currency shortcut
  if (from === to) {
    return {
      fromCurrency: from,
      toCurrency: to,
      rateDate: refDate,
      domain,
      state: 'supported',
      rate: 1,
      rateDateResolved: refDate,
      source: 'identity',
      ageDays: 0,
      stalenessThresholdDays: threshold,
      composedViaUsd: false,
      message: `${from}→${to} es identidad (1.00).`
    }
  }

  // 2. Domain gate — cheap deny before any DB work
  const fromSupported = isSupportedCurrencyForDomain(from, domain)
  const toSupported = isSupportedCurrencyForDomain(to, domain)

  if (!fromSupported || !toSupported) {
    const supported = CURRENCY_DOMAIN_SUPPORT[domain].join(', ')

    return {
      fromCurrency: from,
      toCurrency: to,
      rateDate: refDate,
      domain,
      state: 'unsupported',
      rate: null,
      rateDateResolved: null,
      source: null,
      ageDays: null,
      stalenessThresholdDays: threshold,
      composedViaUsd: false,
      message: `Dominio "${domain}" solo admite ${supported}. Par solicitado: ${from}→${to}.`
    }
  }

  // 3. Direct lookup
  let rateValue: number | null = null
  let rateDateResolved: string | null = null
  let source: string | null = null
  let composedViaUsd = false

  const direct = await fetchDirectRow(from, to, refDate)

  if (direct) {
    rateValue = toNumber(direct.rate)
    rateDateResolved = toIsoDate(direct.rate_date)
    source = direct.source
  }

  // 4. Inverse lookup (only if direct missing AND inverse fallback allowed)
  if (rateValue === null) {
    const entry = getCurrencyRegistryEntry(from)
    const inverseAllowed = entry?.fallbackStrategies.includes('inverse') ?? false

    if (inverseAllowed) {
      const inverse = await fetchDirectRow(to, from, refDate)

      if (inverse) {
        const inverseRate = toNumber(inverse.rate)

        if (inverseRate !== null) {
          rateValue = 1 / inverseRate
          rateDateResolved = toIsoDate(inverse.rate_date)
          source = inverse.source ? `${inverse.source}:inverse` : 'inverse'
        }
      }
    }
  }

  // 5. USD composition (only if both registry entries allow it)
  if (rateValue === null && from !== 'USD' && to !== 'USD') {
    const fromAllows = allowsUsdComposition(from)
    const toAllows = allowsUsdComposition(to)

    if (fromAllows && toAllows) {
      const [fromToUsd, usdToTo] = await Promise.all([
        fetchDirectRow(from, 'USD', refDate),
        fetchDirectRow('USD', to, refDate)
      ])

      if (fromToUsd && usdToTo) {
        const leg1 = toNumber(fromToUsd.rate)
        const leg2 = toNumber(usdToTo.rate)

        if (leg1 !== null && leg2 !== null) {
          rateValue = leg1 * leg2
          const d1 = toIsoDate(fromToUsd.rate_date) ?? refDate
          const d2 = toIsoDate(usdToTo.rate_date) ?? refDate

          rateDateResolved = d1 < d2 ? d1 : d2
          source = `composed_via_usd(${fromToUsd.source ?? 'unknown'},${usdToTo.source ?? 'unknown'})`
          composedViaUsd = true
        }
      }
    }
  }

  // 6. Classify state
  if (rateValue === null || rateDateResolved === null) {
    return {
      fromCurrency: from,
      toCurrency: to,
      rateDate: refDate,
      domain,
      state: 'temporarily_unavailable',
      rate: null,
      rateDateResolved: null,
      source: null,
      ageDays: null,
      stalenessThresholdDays: threshold,
      composedViaUsd: false,
      message: buildMessage(from, to, 'temporarily_unavailable', null, threshold, false)
    }
  }

  const age = ageInDays(rateDateResolved, refDate)
  const isStale = age > threshold
  const state = isStale ? 'supported_but_stale' : 'supported'

  return {
    fromCurrency: from,
    toCurrency: to,
    rateDate: refDate,
    domain,
    state,
    rate: rateValue,
    rateDateResolved,
    source,
    ageDays: age,
    stalenessThresholdDays: threshold,
    composedViaUsd,
    message: buildMessage(from, to, state, age, threshold, composedViaUsd)
  }
}
