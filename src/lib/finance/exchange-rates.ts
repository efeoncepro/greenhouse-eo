import 'server-only'

import { getFinanceProjectId, normalizeString, roundCurrency, runFinanceQuery, toDateString, toNumber, type FinanceCurrency } from '@/lib/finance/shared'

const MINDICADOR_BASE_URL = 'https://mindicador.cl/api'
const OPEN_EXCHANGE_RATE_BASE_URL = 'https://open.er-api.com/v6'

type ExchangeRateProviderResult = {
  rateDate: string
  usdToClp: number
  source: string
}

type PersistedExchangeRate = {
  rateId: string
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  rate: number
  rateDate: string
  source: string
}

const formatDateAsMindicador = (date: string) => {
  const [year, month, day] = date.split('-')

  return `${day}-${month}-${year}`
}

const getTodayInSantiago = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

const fetchMindicadorUsdToClp = async (rateDate?: string | null): Promise<ExchangeRateProviderResult | null> => {
  const path = rateDate
    ? `/dolar/${formatDateAsMindicador(rateDate)}`
    : '/dolar'

  const response = await fetch(`${MINDICADOR_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    serie?: Array<{ fecha?: string; valor?: number }>
  }

  const latest = Array.isArray(payload.serie) ? payload.serie[0] : null
  const value = typeof latest?.valor === 'number' ? latest.valor : Number.NaN
  const fetchedDate = typeof latest?.fecha === 'string' ? latest.fecha.slice(0, 10) : rateDate || null

  if (!Number.isFinite(value) || value <= 0 || !fetchedDate) {
    return null
  }

  return {
    rateDate: fetchedDate,
    usdToClp: roundCurrency(value),
    source: 'mindicador'
  }
}

const fetchOpenExchangeRateUsdToClp = async (): Promise<ExchangeRateProviderResult | null> => {
  const response = await fetch(`${OPEN_EXCHANGE_RATE_BASE_URL}/latest/USD`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    time_last_update_utc?: string
    rates?: Record<string, number>
  }

  const value = Number(payload.rates?.CLP)

  const fetchedDate = typeof payload.time_last_update_utc === 'string'
    ? new Date(payload.time_last_update_utc).toISOString().slice(0, 10)
    : null

  if (!Number.isFinite(value) || value <= 0 || !fetchedDate) {
    return null
  }

  return {
    rateDate: fetchedDate,
    usdToClp: roundCurrency(value),
    source: 'open-er-api'
  }
}

export const fetchUsdToClpFromProviders = async (rateDate?: string | null) => {
  const requestedDate = normalizeString(rateDate) || null

  const primary = await fetchMindicadorUsdToClp(requestedDate)

  if (primary) {
    return primary
  }

  const fallback = await fetchOpenExchangeRateUsdToClp()

  if (fallback) {
    return fallback
  }

  if (requestedDate) {
    const latestMindicador = await fetchMindicadorUsdToClp(null)

    if (latestMindicador) {
      return latestMindicador
    }

    const latestOpenExchangeRate = await fetchOpenExchangeRateUsdToClp()

    if (latestOpenExchangeRate) {
      return latestOpenExchangeRate
    }
  }

  return null
}

export const getLatestStoredExchangeRatePair = async ({
  fromCurrency,
  toCurrency
}: {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
}) => {
  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<{
    rate_id: string
    from_currency: string
    to_currency: string
    rate: unknown
    rate_date: unknown
    source: string | null
  }>(`
    SELECT rate_id, from_currency, to_currency, rate, rate_date, source
    FROM \`${projectId}.greenhouse.fin_exchange_rates\`
    WHERE from_currency = @fromCurrency AND to_currency = @toCurrency
    ORDER BY rate_date DESC
    LIMIT 1
  `, { fromCurrency, toCurrency })

  const row = rows[0]

  if (!row) {
    return null
  }

  const rateDate = toDateString(row.rate_date as { value?: string } | string | null)

  if (!rateDate) {
    return null
  }

  return {
    rateId: normalizeString(row.rate_id),
    fromCurrency,
    toCurrency,
    rate: roundCurrency(toNumber(row.rate)),
    rateDate,
    source: normalizeString(row.source) || 'manual'
  }
}

const buildRatePair = ({
  fromCurrency,
  toCurrency,
  rate,
  rateDate,
  source
}: {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  rate: number
  rateDate: string
  source: string
}): PersistedExchangeRate => ({
  rateId: `${fromCurrency}_${toCurrency}_${rateDate}`,
  fromCurrency,
  toCurrency,
  rate: roundCurrency(rate),
  rateDate,
  source
})

export const buildUsdClpRatePairs = ({
  usdToClp,
  rateDate,
  source
}: {
  usdToClp: number
  rateDate: string
  source: string
}) => {
  const normalizedUsdToClp = roundCurrency(usdToClp)
  const clpToUsd = roundCurrency(1 / normalizedUsdToClp)

  return [
    buildRatePair({
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rate: normalizedUsdToClp,
      rateDate,
      source
    }),
    buildRatePair({
      fromCurrency: 'CLP',
      toCurrency: 'USD',
      rate: clpToUsd,
      rateDate,
      source
    })
  ]
}

export const upsertExchangeRates = async (rates: PersistedExchangeRate[]) => {
  if (rates.length === 0) {
    return []
  }

  const projectId = getFinanceProjectId()

  for (const rate of rates) {
    await runFinanceQuery(`
      MERGE \`${projectId}.greenhouse.fin_exchange_rates\` AS target
      USING (
        SELECT
          @rateId AS rate_id,
          @fromCurrency AS from_currency,
          @toCurrency AS to_currency,
          @rate AS rate,
          @rateDate AS rate_date,
          @source AS source,
          CURRENT_TIMESTAMP() AS created_at
      ) AS source
      ON target.rate_id = source.rate_id
      WHEN MATCHED THEN
        UPDATE SET rate = source.rate, source = source.source
      WHEN NOT MATCHED THEN
        INSERT (rate_id, from_currency, to_currency, rate, rate_date, source, created_at)
        VALUES (source.rate_id, source.from_currency, source.to_currency, source.rate, source.rate_date, source.source, source.created_at)
    `, rate)
  }

  return rates
}

export const syncDailyUsdClpExchangeRate = async (requestedDate?: string | null) => {
  const desiredDate = normalizeString(requestedDate) || getTodayInSantiago()
  const fetched = await fetchUsdToClpFromProviders(desiredDate)

  if (!fetched) {
    return {
      synced: false,
      requestedDate: desiredDate,
      rates: [] as PersistedExchangeRate[]
    }
  }

  const rates = buildUsdClpRatePairs({
    usdToClp: fetched.usdToClp,
    rateDate: fetched.rateDate,
    source: fetched.source
  })

  await upsertExchangeRates(rates)

  return {
    synced: true,
    requestedDate: desiredDate,
    fetchedDate: fetched.rateDate,
    source: fetched.source,
    rates
  }
}
