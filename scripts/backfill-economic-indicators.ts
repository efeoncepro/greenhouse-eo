import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

type EconomicIndicatorCode = 'USD_CLP' | 'UF' | 'UTM' | 'IPC'
type Frequency = 'daily' | 'monthly'

type IndicatorDefinition = {
  code: EconomicIndicatorCode
  path: string
  unit: string
  frequency: Frequency
}

type MindicadorSerieItem = {
  fecha?: string
  valor?: number
}

type IndicatorRow = {
  indicatorId: string
  indicatorCode: EconomicIndicatorCode
  indicatorDate: string
  value: number
  source: string
  unit: string
  frequency: Frequency
}

type ExchangeRateRow = {
  rateId: string
  fromCurrency: 'USD' | 'CLP'
  toCurrency: 'USD' | 'CLP'
  rate: number
  rateDate: string
  source: string
}

const MINDICADOR_BASE_URL = 'https://mindicador.cl/api'
const DEFAULT_FROM_DATE = '2026-01-01'

const DEFINITIONS: Record<EconomicIndicatorCode, IndicatorDefinition> = {
  USD_CLP: { code: 'USD_CLP', path: 'dolar', unit: 'Pesos', frequency: 'daily' },
  UF: { code: 'UF', path: 'uf', unit: 'Pesos', frequency: 'daily' },
  UTM: { code: 'UTM', path: 'utm', unit: 'Pesos', frequency: 'monthly' },
  IPC: { code: 'IPC', path: 'ipc', unit: 'Porcentaje', frequency: 'monthly' }
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const roundDecimal = (value: number, decimals: number) => {
  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}

const invertExchangeRate = (rate: number, decimals = 6) => {
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0
  }

  return roundDecimal(1 / rate, decimals)
}

const getTodayInSantiago = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const isWithinRange = (date: string, fromDate: string, toDate: string) => date >= fromDate && date <= toDate

const buildIndicatorId = (indicatorCode: EconomicIndicatorCode, indicatorDate: string) =>
  `${indicatorCode}_${indicatorDate}`

const buildUsdClpRatePairs = ({ rateDate, usdToClp, source }: { rateDate: string; usdToClp: number; source: string }) => {
  const normalizedUsdToClp = roundCurrency(usdToClp)
  const clpToUsd = invertExchangeRate(normalizedUsdToClp)

  return [
    {
      rateId: `USD_CLP_${rateDate}`,
      fromCurrency: 'USD',
      toCurrency: 'CLP',
      rate: normalizedUsdToClp,
      rateDate,
      source
    },
    {
      rateId: `CLP_USD_${rateDate}`,
      fromCurrency: 'CLP',
      toCurrency: 'USD',
      rate: clpToUsd,
      rateDate,
      source
    }
  ] satisfies ExchangeRateRow[]
}

const fetchMindicadorSeriesForYear = async (definition: IndicatorDefinition, year: number) => {
  const response = await fetch(`${MINDICADOR_BASE_URL}/${definition.path}/${year}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    throw new Error(`mindicador ${definition.path}/${year} failed with ${response.status}`)
  }

  const payload = (await response.json()) as { serie?: MindicadorSerieItem[] }

  return Array.isArray(payload.serie) ? payload.serie : []
}

const mapSeriesToIndicators = ({
  definition,
  items,
  fromDate,
  toDate
}: {
  definition: IndicatorDefinition
  items: MindicadorSerieItem[]
  fromDate: string
  toDate: string
}) => {
  return items.flatMap(item => {
    const indicatorDate = typeof item.fecha === 'string' ? item.fecha.slice(0, 10) : null
    const rawValue = typeof item.valor === 'number' ? item.valor : Number.NaN

    if (!indicatorDate || !Number.isFinite(rawValue) || !isWithinRange(indicatorDate, fromDate, toDate)) {
      return []
    }

    return [{
      indicatorId: buildIndicatorId(definition.code, indicatorDate),
      indicatorCode: definition.code,
      indicatorDate,
      value: definition.code === 'IPC' ? roundDecimal(rawValue, 2) : roundCurrency(rawValue),
      source: 'mindicador',
      unit: definition.unit,
      frequency: definition.frequency
    }] satisfies IndicatorRow[]
  })
}

const parseArgs = () => {
  const fromDate = process.argv[2] || DEFAULT_FROM_DATE
  const toDate = process.argv[3] || getTodayInSantiago()

  if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
    throw new Error('Usage: pnpm exec tsx scripts/backfill-economic-indicators.ts [fromDate YYYY-MM-DD] [toDate YYYY-MM-DD]')
  }

  if (fromDate > toDate) {
    throw new Error(`Invalid date range: ${fromDate} > ${toDate}`)
  }

  return { fromDate, toDate }
}

const main = async () => {
  const { fromDate, toDate } = parseArgs()

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const counts: Record<EconomicIndicatorCode, number> = {
    USD_CLP: 0,
    UF: 0,
    UTM: 0,
    IPC: 0
  }

  let exchangeRateCount = 0

  try {
    console.log(`Backfilling economic indicators from ${fromDate} to ${toDate}`)

    for (const definition of Object.values(DEFINITIONS)) {
      const startYear = Number(fromDate.slice(0, 4))
      const endYear = Number(toDate.slice(0, 4))
      const indicatorRows: IndicatorRow[] = []

      for (let year = startYear; year <= endYear; year += 1) {
        const series = await fetchMindicadorSeriesForYear(definition, year)

        indicatorRows.push(
          ...mapSeriesToIndicators({
            definition,
            items: series,
            fromDate,
            toDate
          })
        )
      }

      indicatorRows.sort((a, b) => a.indicatorDate.localeCompare(b.indicatorDate))

      for (const row of indicatorRows) {
        await runGreenhousePostgresQuery(
          `
            INSERT INTO greenhouse_finance.economic_indicators (
              indicator_id,
              indicator_code,
              indicator_date,
              value,
              source,
              unit,
              frequency
            )
            VALUES ($1, $2, $3::date, $4, $5, $6, $7)
            ON CONFLICT (indicator_id) DO UPDATE
            SET
              indicator_code = EXCLUDED.indicator_code,
              indicator_date = EXCLUDED.indicator_date,
              value = EXCLUDED.value,
              source = EXCLUDED.source,
              unit = EXCLUDED.unit,
              frequency = EXCLUDED.frequency,
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            row.indicatorId,
            row.indicatorCode,
            row.indicatorDate,
            row.value,
            row.source,
            row.unit,
            row.frequency
          ]
        )

        counts[row.indicatorCode] += 1

        if (row.indicatorCode === 'USD_CLP') {
          const pairs = buildUsdClpRatePairs({
            rateDate: row.indicatorDate,
            usdToClp: row.value,
            source: row.source
          })

          for (const pair of pairs) {
            await runGreenhousePostgresQuery(
              `
                INSERT INTO greenhouse_finance.exchange_rates (
                  rate_id,
                  from_currency,
                  to_currency,
                  rate,
                  rate_date,
                  source
                )
                VALUES ($1, $2, $3, $4, $5::date, $6)
                ON CONFLICT (rate_id) DO UPDATE
                SET
                  from_currency = EXCLUDED.from_currency,
                  to_currency = EXCLUDED.to_currency,
                  rate = EXCLUDED.rate,
                  rate_date = EXCLUDED.rate_date,
                  source = EXCLUDED.source,
                  updated_at = CURRENT_TIMESTAMP
              `,
              [
                pair.rateId,
                pair.fromCurrency,
                pair.toCurrency,
                pair.rate,
                pair.rateDate,
                pair.source
              ]
            )

            exchangeRateCount += 1
          }
        }
      }

      console.log(`${definition.code}: ${indicatorRows.length} rows upserted`)
    }

    const verification = await runGreenhousePostgresQuery<{
      indicator_code: string
      row_count: number
      min_date: string | null
      max_date: string | null
    }>(
      `
        SELECT
          indicator_code,
          COUNT(*)::int AS row_count,
          MIN(indicator_date)::text AS min_date,
          MAX(indicator_date)::text AS max_date
        FROM greenhouse_finance.economic_indicators
        WHERE indicator_date BETWEEN $1::date AND $2::date
        GROUP BY indicator_code
        ORDER BY indicator_code
      `,
      [fromDate, toDate]
    )

    console.log('\nVerification:')
    console.log(JSON.stringify({ counts, exchangeRateCount, verification }, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
