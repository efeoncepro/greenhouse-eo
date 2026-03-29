import {
  getFinanceProjectId,
  normalizeString,
  roundDecimal,
  roundCurrency,
  runFinanceQuery,
  toDateString,
  toNumber
} from '@/lib/finance/shared'
import {
  getFinanceEconomicIndicatorAtOrBeforeFromPostgres,
  getLatestFinanceEconomicIndicatorFromPostgres,
  shouldFallbackFromFinancePostgres,
  type FinanceEconomicIndicatorCode,
  type FinanceEconomicIndicatorRecord,
  upsertFinanceEconomicIndicatorInPostgres
} from '@/lib/finance/postgres-store'
import { buildUsdClpRatePairs, upsertExchangeRates } from '@/lib/finance/exchange-rates'

const MINDICADOR_BASE_URL = 'https://mindicador.cl/api'

// Default set used by Finance dashboard cards.
export const ECONOMIC_INDICATOR_DASHBOARD_CODES = ['USD_CLP', 'UF', 'UTM', 'IPC'] as const

// Full supported set for canonical storage and historical queries.
export const ECONOMIC_INDICATOR_CODES = [...ECONOMIC_INDICATOR_DASHBOARD_CODES, 'IMM'] as const
export type EconomicIndicatorCode = (typeof ECONOMIC_INDICATOR_CODES)[number]

type EconomicIndicatorFrequency = 'daily' | 'monthly'

type EconomicIndicatorDefinition = {
  code: EconomicIndicatorCode
  path: string
  unit: string
  frequency: EconomicIndicatorFrequency
  provider: 'mindicador' | 'manual_only'
}

type MindicadorSerieItem = {
  fecha?: string
  valor?: number
}

type EconomicIndicatorSnapshot = {
  indicatorId: string
  indicatorCode: EconomicIndicatorCode
  indicatorDate: string
  value: number
  source: string
  unit: string
  frequency: EconomicIndicatorFrequency
}

const DEFINITIONS: Record<EconomicIndicatorCode, EconomicIndicatorDefinition> = {
  USD_CLP: { code: 'USD_CLP', path: 'dolar', unit: 'Pesos', frequency: 'daily', provider: 'mindicador' },
  UF: { code: 'UF', path: 'uf', unit: 'Pesos', frequency: 'daily', provider: 'mindicador' },
  UTM: { code: 'UTM', path: 'utm', unit: 'Pesos', frequency: 'monthly', provider: 'mindicador' },
  IPC: { code: 'IPC', path: 'ipc', unit: 'Porcentaje', frequency: 'monthly', provider: 'mindicador' },

  // Ingreso Minimo Mensual (Chile): stored canonically, but the source is not mindicador.
  // This intentionally does not fetch from mindicador to avoid relying on a non-existent endpoint.
  IMM: { code: 'IMM', path: 'imm', unit: 'Pesos', frequency: 'monthly', provider: 'manual_only' }
}

const getTodayInSantiago = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

const buildIndicatorId = (indicatorCode: EconomicIndicatorCode, indicatorDate: string) => `${indicatorCode}_${indicatorDate}`

const startOfYear = (year: number) => `${year}-01-01`

const endOfYear = (year: number) => `${year}-12-31`

const isWithinRange = (date: string, fromDate: string, toDate: string) => date >= fromDate && date <= toDate

const sortSnapshotsAsc = (items: EconomicIndicatorSnapshot[]) =>
  [...items].sort((a, b) => a.indicatorDate.localeCompare(b.indicatorDate))

export const shouldIgnoreEconomicIndicatorsBigQueryError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return (
    /not found: table/i.test(message)
    || /dataset .* was not found/i.test(message)
    || message.includes('fin_economic_indicators')
  )
}

const normalizeStoredRecord = (record: FinanceEconomicIndicatorRecord): EconomicIndicatorSnapshot => ({
  indicatorId: record.indicatorId,
  indicatorCode: record.indicatorCode,
  indicatorDate: record.indicatorDate,
  value: record.value,
  source: record.source,
  unit: record.unit || DEFINITIONS[record.indicatorCode].unit,
  frequency: (record.frequency as EconomicIndicatorFrequency | null) || DEFINITIONS[record.indicatorCode].frequency
})

const fetchMindicadorSeriesForYear = async (indicatorCode: EconomicIndicatorCode, year: number) => {
  const definition = DEFINITIONS[indicatorCode]

  if (definition.provider !== 'mindicador') {
    return [] as MindicadorSerieItem[]
  }

  const response = await fetch(`${MINDICADOR_BASE_URL}/${definition.path}/${year}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    return [] as MindicadorSerieItem[]
  }

  const payload = (await response.json()) as { serie?: MindicadorSerieItem[] }

  return Array.isArray(payload.serie) ? payload.serie : []
}

const mapMindicadorSeries = (indicatorCode: EconomicIndicatorCode, items: MindicadorSerieItem[]) => {
  const definition = DEFINITIONS[indicatorCode]

  return items.flatMap(item => {
    const indicatorDate = typeof item.fecha === 'string' ? item.fecha.slice(0, 10) : null
    const value = typeof item.valor === 'number' ? item.valor : Number.NaN

    if (!indicatorDate || !Number.isFinite(value)) {
      return []
    }

    return [{
      indicatorId: buildIndicatorId(indicatorCode, indicatorDate),
      indicatorCode,
      indicatorDate,
      value: indicatorCode === 'IPC' ? toNumber(value) : roundCurrency(value),
      source: 'mindicador',
      unit: definition.unit,
      frequency: definition.frequency
    }] satisfies EconomicIndicatorSnapshot[]
  })
}

export const pickLatestMindicadorSnapshot = (
  indicatorCode: EconomicIndicatorCode,
  items: MindicadorSerieItem[]
) => {
  const snapshots = sortSnapshotsAsc(mapMindicadorSeries(indicatorCode, items))

  return snapshots.at(-1) ?? null
}

const fetchLatestMindicadorIndicator = async (indicatorCode: EconomicIndicatorCode) => {
  const definition = DEFINITIONS[indicatorCode]

  if (definition.provider !== 'mindicador') {
    return null
  }

  const response = await fetch(`${MINDICADOR_BASE_URL}/${definition.path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as { serie?: MindicadorSerieItem[] }

  if (!Array.isArray(payload.serie)) {
    return null
  }

  return pickLatestMindicadorSnapshot(indicatorCode, payload.serie)
}

const fetchMindicadorIndicatorRange = async ({
  indicatorCode,
  fromDate,
  toDate
}: {
  indicatorCode: EconomicIndicatorCode
  fromDate: string
  toDate: string
}) => {
  const startYear = Number(fromDate.slice(0, 4))
  const endYearValue = Number(toDate.slice(0, 4))
  const snapshots: EconomicIndicatorSnapshot[] = []

  for (let year = startYear; year <= endYearValue; year += 1) {
    const series = await fetchMindicadorSeriesForYear(indicatorCode, year)

    snapshots.push(
      ...mapMindicadorSeries(indicatorCode, series).filter(item => isWithinRange(item.indicatorDate, fromDate, toDate))
    )
  }

  return sortSnapshotsAsc(snapshots)
}

const upsertEconomicIndicatorsInBigQuery = async (items: EconomicIndicatorSnapshot[]) => {
  if (items.length === 0) {
    return []
  }

  const projectId = getFinanceProjectId()

  for (const item of items) {
    await runFinanceQuery(
      `
        MERGE \`${projectId}.greenhouse.fin_economic_indicators\` AS target
        USING (
          SELECT
            @indicatorId AS indicator_id,
            @indicatorCode AS indicator_code,
            CAST(@indicatorDate AS DATE) AS indicator_date,
            @value AS value,
            @source AS source,
            @unit AS unit,
            @frequency AS frequency,
            CURRENT_TIMESTAMP() AS updated_at,
            CURRENT_TIMESTAMP() AS created_at
        ) AS source
        ON target.indicator_id = source.indicator_id
        WHEN MATCHED THEN
          UPDATE SET
            indicator_code = source.indicator_code,
            indicator_date = source.indicator_date,
            value = source.value,
            source = source.source,
            unit = source.unit,
            frequency = source.frequency,
            updated_at = source.updated_at
        WHEN NOT MATCHED THEN
          INSERT (indicator_id, indicator_code, indicator_date, value, source, unit, frequency, created_at, updated_at)
          VALUES (
            source.indicator_id,
            source.indicator_code,
            source.indicator_date,
            source.value,
            source.source,
            source.unit,
            source.frequency,
            source.created_at,
            source.updated_at
          )
      `,
      item
    )
  }

  return items
}

const upsertStoredEconomicIndicator = async (item: EconomicIndicatorSnapshot) => {
  try {
    await upsertFinanceEconomicIndicatorInPostgres({
      indicatorId: item.indicatorId,
      indicatorCode: item.indicatorCode as FinanceEconomicIndicatorCode,
      indicatorDate: item.indicatorDate,
      value: item.value,
      source: item.source,
      unit: item.unit,
      frequency: item.frequency
    })
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  await upsertEconomicIndicatorsInBigQuery([item])

  if (item.indicatorCode === 'USD_CLP') {
    await upsertExchangeRates(buildUsdClpRatePairs({
      usdToClp: item.value,
      rateDate: item.indicatorDate,
      source: item.source
    }))
  }

  return item
}

export const upsertEconomicIndicators = async (items: EconomicIndicatorSnapshot[]) => {
  const persisted: EconomicIndicatorSnapshot[] = []

  for (const item of items) {
    persisted.push(await upsertStoredEconomicIndicator(item))
  }

  return persisted
}

const getStoredEconomicIndicatorAtOrBeforeFromBigQuery = async ({
  indicatorCode,
  requestedDate
}: {
  indicatorCode: EconomicIndicatorCode
  requestedDate: string
}) => {
  const projectId = getFinanceProjectId()
  let rows: Array<{
    indicator_id: string
    indicator_code: string
    indicator_date: unknown
    value: unknown
    source: string | null
    unit: string | null
    frequency: string | null
  }>

  try {
    rows = await runFinanceQuery<{
      indicator_id: string
      indicator_code: string
      indicator_date: unknown
      value: unknown
      source: string | null
      unit: string | null
      frequency: string | null
    }>(
      `
        SELECT indicator_id, indicator_code, indicator_date, value, source, unit, frequency
        FROM \`${projectId}.greenhouse.fin_economic_indicators\`
        WHERE indicator_code = @indicatorCode
          AND indicator_date <= CAST(@requestedDate AS DATE)
        ORDER BY indicator_date DESC
        LIMIT 1
      `,
      { indicatorCode, requestedDate }
    )
  } catch (error) {
    if (shouldIgnoreEconomicIndicatorsBigQueryError(error)) {
      return null
    }

    throw error
  }

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    indicatorId: normalizeString(row.indicator_id),
    indicatorCode: normalizeString(row.indicator_code) as EconomicIndicatorCode,
    indicatorDate: toDateString(row.indicator_date as string | { value?: string } | null) || '',
    value: toNumber(row.value),
    source: normalizeString(row.source) || 'manual',
    unit: normalizeString(row.unit) || DEFINITIONS[indicatorCode].unit,
    frequency: (normalizeString(row.frequency) as EconomicIndicatorFrequency) || DEFINITIONS[indicatorCode].frequency
  } satisfies EconomicIndicatorSnapshot
}

const getLatestStoredEconomicIndicatorFromBigQuery = async (indicatorCode: EconomicIndicatorCode) => {
  const projectId = getFinanceProjectId()
  let rows: Array<{
    indicator_id: string
    indicator_code: string
    indicator_date: unknown
    value: unknown
    source: string | null
    unit: string | null
    frequency: string | null
  }>

  try {
    rows = await runFinanceQuery<{
      indicator_id: string
      indicator_code: string
      indicator_date: unknown
      value: unknown
      source: string | null
      unit: string | null
      frequency: string | null
    }>(
      `
        SELECT indicator_id, indicator_code, indicator_date, value, source, unit, frequency
        FROM \`${projectId}.greenhouse.fin_economic_indicators\`
        WHERE indicator_code = @indicatorCode
        ORDER BY indicator_date DESC
        LIMIT 1
      `,
      { indicatorCode }
    )
  } catch (error) {
    if (shouldIgnoreEconomicIndicatorsBigQueryError(error)) {
      return null
    }

    throw error
  }

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    indicatorId: normalizeString(row.indicator_id),
    indicatorCode: normalizeString(row.indicator_code) as EconomicIndicatorCode,
    indicatorDate: toDateString(row.indicator_date as string | { value?: string } | null) || '',
    value: toNumber(row.value),
    source: normalizeString(row.source) || 'manual',
    unit: normalizeString(row.unit) || DEFINITIONS[indicatorCode].unit,
    frequency: (normalizeString(row.frequency) as EconomicIndicatorFrequency) || DEFINITIONS[indicatorCode].frequency
  } satisfies EconomicIndicatorSnapshot
}

export const getEconomicIndicatorAtOrBefore = async ({
  indicatorCode,
  requestedDate
}: {
  indicatorCode: EconomicIndicatorCode
  requestedDate: string
}) => {
  try {
    const stored = await getFinanceEconomicIndicatorAtOrBeforeFromPostgres({
      indicatorCode: indicatorCode as FinanceEconomicIndicatorCode,
      requestedDate
    })

    if (stored) {
      return normalizeStoredRecord(stored)
    }
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  return getStoredEconomicIndicatorAtOrBeforeFromBigQuery({ indicatorCode, requestedDate })
}

export const getLatestEconomicIndicator = async (indicatorCode: EconomicIndicatorCode) => {
  try {
    const stored = await getLatestFinanceEconomicIndicatorFromPostgres({
      indicatorCode: indicatorCode as FinanceEconomicIndicatorCode
    })

    if (stored) {
      return normalizeStoredRecord(stored)
    }
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  return getLatestStoredEconomicIndicatorFromBigQuery(indicatorCode)
}

export const syncEconomicIndicator = async ({
  indicatorCode,
  requestedDate
}: {
  indicatorCode: EconomicIndicatorCode
  requestedDate?: string | null
}) => {
  const desiredDate = normalizeString(requestedDate) || getTodayInSantiago()
  const fromDate = startOfYear(Number(desiredDate.slice(0, 4)))
  const fetched = await fetchMindicadorIndicatorRange({ indicatorCode, fromDate, toDate: desiredDate })
  const latest = fetched.at(-1) || null

  if (!latest) {
    const fallbackLatest = await fetchLatestMindicadorIndicator(indicatorCode)

    if (fallbackLatest) {
      await upsertStoredEconomicIndicator(fallbackLatest)

      return {
        synced: true,
        indicatorCode,
        requestedDate: desiredDate,
        fetchedDate: fallbackLatest.indicatorDate,
        snapshot: fallbackLatest
      }
    }

    return {
      synced: false,
      indicatorCode,
      requestedDate: desiredDate,
      snapshot: null
    }
  }

  await upsertStoredEconomicIndicator(latest)

  return {
    synced: true,
    indicatorCode,
    requestedDate: desiredDate,
    fetchedDate: latest.indicatorDate,
    snapshot: latest
  }
}

export const syncEconomicIndicatorsHistory = async ({
  fromDate,
  toDate,
  indicatorCodes = [...ECONOMIC_INDICATOR_CODES]
}: {
  fromDate: string
  toDate?: string | null
  indicatorCodes?: EconomicIndicatorCode[]
}) => {
  const effectiveToDate = normalizeString(toDate) || getTodayInSantiago()
  const persisted: EconomicIndicatorSnapshot[] = []

  for (const indicatorCode of indicatorCodes) {
    const fetched = await fetchMindicadorIndicatorRange({
      indicatorCode,
      fromDate,
      toDate: effectiveToDate
    })

    if (fetched.length === 0) {
      continue
    }

    persisted.push(...await upsertEconomicIndicators(fetched))
  }

  return {
    synced: true,
    fromDate,
    toDate: effectiveToDate,
    count: persisted.length,
    items: persisted
  }
}

export const getLatestEconomicIndicatorsSummary = async () => {
  const indicators = await Promise.all(
    ECONOMIC_INDICATOR_DASHBOARD_CODES.map(async indicatorCode => {
      let snapshot = await getLatestEconomicIndicator(indicatorCode)

      if (!snapshot) {
        const synced = await syncEconomicIndicator({ indicatorCode })

        snapshot = synced.snapshot
      }

      return [indicatorCode, snapshot] as const
    })
  )

  return Object.fromEntries(indicators)
}

export const DEFAULT_ECONOMIC_INDICATORS_HISTORY_START = '2026-01-01'

export const getHistoricalEconomicIndicatorForPeriod = async ({
  indicatorCode,
  periodDate
}: {
  indicatorCode: EconomicIndicatorCode
  periodDate: string
}) => {
  let snapshot = await getEconomicIndicatorAtOrBefore({
    indicatorCode,
    requestedDate: periodDate
  })

  if (!snapshot) {
    await syncEconomicIndicatorsHistory({
      fromDate: startOfYear(Number(periodDate.slice(0, 4))),
      toDate: endOfYear(Number(periodDate.slice(0, 4))),
      indicatorCodes: [indicatorCode]
    })

    snapshot = await getEconomicIndicatorAtOrBefore({
      indicatorCode,
      requestedDate: periodDate
    })
  }

  return snapshot
}

export const convertUfToClpValue = ({
  amountUf,
  ufValue
}: {
  amountUf: number
  ufValue: number
}) => roundCurrency(amountUf * ufValue)

export const convertClpToUfValue = ({
  amountClp,
  ufValue,
  decimals = 4
}: {
  amountClp: number
  ufValue: number
  decimals?: number
}) => {
  if (!Number.isFinite(amountClp) || !Number.isFinite(ufValue) || ufValue <= 0) {
    return 0
  }

  return roundDecimal(amountClp / ufValue, decimals)
}

export const convertUtmToClpValue = ({
  amountUtm,
  utmValue
}: {
  amountUtm: number
  utmValue: number
}) => roundCurrency(amountUtm * utmValue)

export const convertClpToUtmValue = ({
  amountClp,
  utmValue,
  decimals = 4
}: {
  amountClp: number
  utmValue: number
  decimals?: number
}) => {
  if (!Number.isFinite(amountClp) || !Number.isFinite(utmValue) || utmValue <= 0) {
    return 0
  }

  return roundDecimal(amountClp / utmValue, decimals)
}

export const convertUfToClpAtDate = async ({
  amountUf,
  date
}: {
  amountUf: number
  date: string
}) => {
  const snapshot = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'UF',
    periodDate: date
  })

  return snapshot
    ? {
        value: convertUfToClpValue({ amountUf, ufValue: snapshot.value }),
        indicatorDate: snapshot.indicatorDate,
        indicatorValue: snapshot.value,
        source: snapshot.source
      }
    : null
}

export const convertClpToUfAtDate = async ({
  amountClp,
  date,
  decimals
}: {
  amountClp: number
  date: string
  decimals?: number
}) => {
  const snapshot = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'UF',
    periodDate: date
  })

  return snapshot
    ? {
        value: convertClpToUfValue({ amountClp, ufValue: snapshot.value, decimals }),
        indicatorDate: snapshot.indicatorDate,
        indicatorValue: snapshot.value,
        source: snapshot.source
      }
    : null
}

export const convertUtmToClpAtDate = async ({
  amountUtm,
  date
}: {
  amountUtm: number
  date: string
}) => {
  const snapshot = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'UTM',
    periodDate: date
  })

  return snapshot
    ? {
        value: convertUtmToClpValue({ amountUtm, utmValue: snapshot.value }),
        indicatorDate: snapshot.indicatorDate,
        indicatorValue: snapshot.value,
        source: snapshot.source
      }
    : null
}

export const convertClpToUtmAtDate = async ({
  amountClp,
  date,
  decimals
}: {
  amountClp: number
  date: string
  decimals?: number
}) => {
  const snapshot = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'UTM',
    periodDate: date
  })

  return snapshot
    ? {
        value: convertClpToUtmValue({ amountClp, utmValue: snapshot.value, decimals }),
        indicatorDate: snapshot.indicatorDate,
        indicatorValue: snapshot.value,
        source: snapshot.source
      }
    : null
}
