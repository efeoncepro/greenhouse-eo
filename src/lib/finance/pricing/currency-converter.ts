import 'server-only'

import { query } from '@/lib/db'

import type { PricingOutputCurrency } from './contracts'

type FxRateRow = {
  rate: string | number
  rate_date: string | Date
}

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { expiresAt: number; value: number | null }>()

const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000
const round2 = (value: number) => Math.round(value * 100) / 100
const toNumber = (value: string | number) => (typeof value === 'number' ? value : Number(value))

const normalizeCurrency = (value: string): string => value.trim().toUpperCase()
const resolveRateDate = (value?: string | null) => value?.trim() || new Date().toISOString().slice(0, 10)

const cacheKey = (fromCurrency: string, toCurrency: string, rateDate: string) =>
  `${normalizeCurrency(fromCurrency)}:${normalizeCurrency(toCurrency)}:${rateDate}`

const getCached = (key: string) => {
  const hit = cache.get(key)

  if (!hit) return undefined

  if (hit.expiresAt <= Date.now()) {
    cache.delete(key)

    return undefined
  }

  return hit.value
}

const setCached = (key: string, value: number | null) => {
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value
  })
}

export const getExchangeRateOnOrBefore = async ({
  fromCurrency,
  toCurrency,
  rateDate
}: {
  fromCurrency: string
  toCurrency: string
  rateDate?: string | null
}): Promise<number | null> => {
  const normalizedFrom = normalizeCurrency(fromCurrency)
  const normalizedTo = normalizeCurrency(toCurrency)
  const resolvedRateDate = resolveRateDate(rateDate)

  if (normalizedFrom === normalizedTo) {
    return 1
  }

  const directKey = cacheKey(normalizedFrom, normalizedTo, resolvedRateDate)
  const cachedDirect = getCached(directKey)

  if (cachedDirect !== undefined) {
    return cachedDirect
  }

  const directRows = await query<FxRateRow>(
    `SELECT rate, rate_date
     FROM greenhouse_finance.exchange_rates
     WHERE from_currency = $1
       AND to_currency = $2
       AND rate_date <= $3::date
     ORDER BY rate_date DESC
     LIMIT 1`,
    [normalizedFrom, normalizedTo, resolvedRateDate]
  )

  const directRate = directRows[0] ? toNumber(directRows[0].rate) : null

  if (directRate && directRate > 0) {
    const rounded = round6(directRate)

    setCached(directKey, rounded)

    return rounded
  }

  const inverseKey = cacheKey(normalizedTo, normalizedFrom, resolvedRateDate)
  const cachedInverse = getCached(inverseKey)

  if (cachedInverse !== undefined) {
    const inverted = cachedInverse && cachedInverse > 0 ? round6(1 / cachedInverse) : null

    setCached(directKey, inverted)

    return inverted
  }

  const inverseRows = await query<FxRateRow>(
    `SELECT rate, rate_date
     FROM greenhouse_finance.exchange_rates
     WHERE from_currency = $1
       AND to_currency = $2
       AND rate_date <= $3::date
     ORDER BY rate_date DESC
     LIMIT 1`,
    [normalizedTo, normalizedFrom, resolvedRateDate]
  )

  const inverseRate = inverseRows[0] ? toNumber(inverseRows[0].rate) : null

  const resolved =
    inverseRate && inverseRate > 0
      ? round6(1 / inverseRate)
      : null

  setCached(directKey, resolved)
  setCached(inverseKey, inverseRate && inverseRate > 0 ? round6(inverseRate) : null)

  return resolved
}

export const convertCurrencyAmount = async ({
  amount,
  fromCurrency,
  toCurrency,
  rateDate
}: {
  amount: number
  fromCurrency: string
  toCurrency: string
  rateDate?: string | null
}): Promise<number | null> => {
  if (!Number.isFinite(amount)) return null

  const rate = await getExchangeRateOnOrBefore({
    fromCurrency,
    toCurrency,
    rateDate
  })

  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    return null
  }

  return round2(amount * rate)
}

export const convertUsdToPricingCurrency = async ({
  amountUsd,
  currency,
  rateDate
}: {
  amountUsd: number
  currency: PricingOutputCurrency
  rateDate?: string | null
}): Promise<number | null> => {
  return convertCurrencyAmount({
    amount: amountUsd,
    fromCurrency: 'USD',
    toCurrency: currency,
    rateDate
  })
}

export const resolvePricingOutputExchangeRate = async ({
  currency,
  rateDate
}: {
  currency: PricingOutputCurrency
  rateDate?: string | null
}): Promise<number> => {
  if (currency === 'USD') {
    return 1
  }

  const rate = await getExchangeRateOnOrBefore({
    fromCurrency: 'USD',
    toCurrency: currency,
    rateDate
  })

  return rate && rate > 0 ? rate : 1
}
