import { randomUUID } from 'node:crypto'

import type { PoolClient, QueryResultRow } from 'pg'

import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { assertPayrollPostgresReady } from '@/lib/payroll/postgres-store'
import { normalizeString } from '@/lib/payroll/shared'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

type GaelPreviredPayload = {
  PreviredID?: number | string
  Fecha?: string
  PeriodoMY?: string
  PeriodoYM?: string
  UFValPeriodo?: string | number
  UTMVal?: string | number
  RMITrabDepeInd?: string | number
  TasaSIS?: string | number
  RTIAfpUF?: string | number
  RTISegCesUF?: string | number
  AFPCapitalTasaDepTrab?: string | number
  AFPCapitalTasaDepAPagar?: string | number
  AFPCuprumTasaDepTrab?: string | number
  AFPCuprumTasaDepAPagar?: string | number
  AFPHabitatTasaDepTrab?: string | number
  AFPHabitatTasaDepAPagar?: string | number
  AFPPlanVitalTasaDepTrab?: string | number
  AFPPlanVitalTasaDepAPagar?: string | number
  AFPProVidaTasaDepTrab?: string | number
  AFPProVidaTasaDepAPagar?: string | number
  AFPModeloTasaDepTrab?: string | number
  AFPModeloTasaDepAPagar?: string | number
  AFPUnoTasaDepTrab?: string | number
  AFPUnoTasaDepAPagar?: string | number
}

type GaelImpUnicoPayload = {
  ImpUnicoID?: number | string
  FechaUpdate?: string
  PeriodoMY?: string
  PeriodoNombre?: string
  FechaDesde?: string
  FechaHasta?: string
  TR1Desde?: string | number
  TR1Hasta?: string | number
  TR1Factor?: string | number
  TR1CReb?: string | number
  TR2Desde?: string | number
  TR2Hasta?: string | number
  TR2Factor?: string | number
  TR2CReb?: string | number
  TR3Desde?: string | number
  TR3Hasta?: string | number
  TR3Factor?: string | number
  TR3CReb?: string | number
  TR4Desde?: string | number
  TR4Hasta?: string | number
  TR4Factor?: string | number
  TR4CReb?: string | number
  TR5Desde?: string | number
  TR5Hasta?: string | number
  TR5Factor?: string | number
  TR5CReb?: string | number
  TR6Desde?: string | number
  TR6Hasta?: string | number
  TR6Factor?: string | number
  TR6CReb?: string | number
  TR7Desde?: string | number
  TR7Hasta?: string | number
  TR7Factor?: string | number
  TR7CReb?: string | number
  TR8Desde?: string | number
  TR8Hasta?: string | number
  TR8Factor?: string | number
  TR8CReb?: string | number
}

type ChilePreviredPeriodSnapshot = {
  periodYear: number
  periodMonth: number
  ufValue: number
  utmValue: number
  immClp: number
  sisRate: number
  topeAfpUf: number
  topeCesantiaUf: number
  source: string
  sourceUrl: string
}

type ChileAfpRateSnapshot = {
  afpRateId: string
  periodYear: number
  periodMonth: number
  afpName: string
  workerRate: number
  totalRate: number
  source: string
  isActive: boolean
}

type ChileTaxBracketSnapshot = {
  bracketId: string
  taxTableVersion: string
  bracketOrder: number
  fromUtm: number
  toUtm: number | null
  rate: number
  deductionUtm: number
  effectiveFrom: string
}

type SyncPartStatus = {
  status: 'ok' | 'error'
  sourceUrl?: string
  rows?: number
  message?: string
}

type PreviredSyncOutcome = {
  previred: SyncPartStatus
  impunico: SyncPartStatus
  eventId?: string
  utmValue?: number
}

export type ChilePrevisionalSyncResult = {
  periodYear: number
  periodMonth: number
  previred: SyncPartStatus
  impunico: SyncPartStatus
  durationMs: number
  outboxEventId?: string
}

type PreviredSyncRunStatus = 'running' | 'succeeded' | 'failed' | 'partial'

const GAEL_BASE_URL = 'https://api.gael.cloud/general/public'
const SOURCE_LABEL = 'gael_api'

const normalizePeriodKey = (year: number, month: number) => `${String(month).padStart(2, '0')}${year}`
const buildPreviredUrl = (year: number, month: number) => `${GAEL_BASE_URL}/previred/${normalizePeriodKey(year, month)}`
const buildImpUnicoUrl = (year: number, month: number) => `${GAEL_BASE_URL}/impunico/${normalizePeriodKey(year, month)}`
const buildTaxTableVersion = (year: number, month: number) => `gael-${year}-${String(month).padStart(2, '0')}`

const buildPreviredSyncRunId = (year: number, month: number) =>
  `previred-${year}-${String(month).padStart(2, '0')}-${randomUUID()}`

const parseGaelNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const raw = normalizeString(value)

  if (!raw) {
    return 0
  }

  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

const parseGaelPercent = (value: unknown) => parseGaelNumber(value) / 100

const parsePeriodoMy = (value: unknown): { year: number; month: number } | null => {
  const raw = normalizeString(value)

  if (!raw || !/^\d{6}$/.test(raw)) {
    return null
  }

  const month = Number(raw.slice(0, 2))
  const year = Number(raw.slice(2, 6))

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const parseDateLike = (value: unknown): string | null => {
  const raw = normalizeString(value)

  if (!raw) {
    return null
  }

  const date = new Date(raw)

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const queryRow = async <T extends QueryResultRow>(client: PoolClient, text: string, values: unknown[] = []) => {
  const result = await client.query<T>(text, values)

  return result.rows
}

const fetchGaelJson = async <T>(url: string) => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    throw new Error(`Gael API request failed with status ${response.status} for ${url}`)
  }

  return response.json() as Promise<T>
}

const writePreviredSyncRunStart = async ({
  runId,
  periodYear,
  periodMonth
}: {
  runId: string
  periodYear: number
  periodMonth: number
}) => {
  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_sync.source_sync_runs (
        sync_run_id, source_system, source_object_type, sync_mode,
        status, records_read, records_written_raw, triggered_by, notes, started_at
      )
      VALUES ($1, 'previred', 'chile_previsional_period', 'cron', 'running', 0, 0, 'cron:sync-previred', $2, CURRENT_TIMESTAMP)
      ON CONFLICT (sync_run_id) DO NOTHING`,
      [runId, `period=${periodYear}-${String(periodMonth).padStart(2, '0')}`]
    )
  } catch (error) {
    console.warn('[sync-previred] failed to write start run log', error)
  }
}

const writePreviredSyncRunOutcome = async ({
  runId,
  status,
  periodYear,
  periodMonth,
  previred,
  impunico
}: {
  runId: string
  status: PreviredSyncRunStatus
  periodYear: number
  periodMonth: number
  previred: SyncPartStatus
  impunico: SyncPartStatus
}) => {
  const recordsWritten = (previred.rows ?? 0) + (impunico.rows ?? 0)

  const notes = [
    `period=${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    `previred=${previred.status}${typeof previred.rows === 'number' ? `:${previred.rows}` : ''}`,
    `impunico=${impunico.status}${typeof impunico.rows === 'number' ? `:${impunico.rows}` : ''}`,
    previred.message ? `previred_message=${previred.message}` : null,
    impunico.message ? `impunico_message=${impunico.message}` : null
  ]
    .filter(Boolean)
    .join('; ')
    .slice(0, 2000)

  try {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_sync.source_sync_runs
       SET status = $2,
           records_written_raw = $3,
           notes = $4,
           finished_at = CURRENT_TIMESTAMP
       WHERE sync_run_id = $1`,
      [runId, status, recordsWritten, notes]
    )
  } catch (error) {
    console.warn('[sync-previred] failed to write outcome run log', error)
  }
}

export const parsePreviredPayload = (payload: GaelPreviredPayload): ChilePreviredPeriodSnapshot => {
  const parsedPeriod = parsePeriodoMy(payload.PeriodoMY)

  if (!parsedPeriod) {
    throw new Error('Gael Previred payload is missing a valid PeriodoMY value.')
  }

  return {
    periodYear: parsedPeriod.year,
    periodMonth: parsedPeriod.month,
    ufValue: parseGaelNumber(payload.UFValPeriodo),
    utmValue: parseGaelNumber(payload.UTMVal),
    immClp: Math.round(parseGaelNumber(payload.RMITrabDepeInd)),
    sisRate: parseGaelPercent(payload.TasaSIS),
    topeAfpUf: parseGaelNumber(payload.RTIAfpUF),
    topeCesantiaUf: parseGaelNumber(payload.RTISegCesUF),
    source: SOURCE_LABEL,
    sourceUrl: buildPreviredUrl(parsedPeriod.year, parsedPeriod.month)
  }
}

const parseAfpRateRow = (
  periodYear: number,
  periodMonth: number,
  afpName: string,
  workerRate: unknown,
  totalRate: unknown
): ChileAfpRateSnapshot | null => {
  const normalizedName = normalizeString(afpName)

  if (!normalizedName) {
    return null
  }

  const parsedRate = parseGaelPercent(totalRate)

  if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
    return null
  }

  return {
    afpRateId: `gael-afp-${periodYear}-${String(periodMonth).padStart(2, '0')}-${normalizedName.toLowerCase()}`,
    periodYear,
    periodMonth,
    afpName: normalizedName,
    workerRate: parseGaelPercent(workerRate),
    totalRate: parsedRate,
    source: SOURCE_LABEL,
    isActive: true
  }
}

export const parsePreviredAfpRates = (payload: GaelPreviredPayload): ChileAfpRateSnapshot[] => {
  const parsedPeriod = parsePeriodoMy(payload.PeriodoMY)

  if (!parsedPeriod) {
    throw new Error('Gael Previred payload is missing a valid PeriodoMY value.')
  }

  const entries: Array<[string, unknown, unknown]> = [
    ['Capital', payload.AFPCapitalTasaDepTrab, payload.AFPCapitalTasaDepAPagar],
    ['Cuprum', payload.AFPCuprumTasaDepTrab, payload.AFPCuprumTasaDepAPagar],
    ['Habitat', payload.AFPHabitatTasaDepTrab, payload.AFPHabitatTasaDepAPagar],
    ['PlanVital', payload.AFPPlanVitalTasaDepTrab, payload.AFPPlanVitalTasaDepAPagar],
    ['ProVida', payload.AFPProVidaTasaDepTrab, payload.AFPProVidaTasaDepAPagar],
    ['Modelo', payload.AFPModeloTasaDepTrab, payload.AFPModeloTasaDepAPagar],
    ['Uno', payload.AFPUnoTasaDepTrab, payload.AFPUnoTasaDepAPagar]
  ]

  return entries
    .map(([name, workerRate, rate]) => parseAfpRateRow(parsedPeriod.year, parsedPeriod.month, name, workerRate, rate))
    .filter((row): row is ChileAfpRateSnapshot => row !== null)
}

export const parseImpUnicoPayload = (payload: GaelImpUnicoPayload, utmValue: number) => {
  const parsedPeriod = parsePeriodoMy(payload.PeriodoMY)

  if (!parsedPeriod) {
    throw new Error('Gael ImpUnico payload is missing a valid PeriodoMY value.')
  }

  if (!Number.isFinite(utmValue) || utmValue <= 0) {
    throw new Error('Gael ImpUnico payload requires a valid UTM value from the same period.')
  }

  const version = buildTaxTableVersion(parsedPeriod.year, parsedPeriod.month)
  const effectiveFrom = parseDateLike(payload.FechaDesde) || `${parsedPeriod.year}-${String(parsedPeriod.month).padStart(2, '0')}-01`
  const toUtm = (value: unknown) => parseGaelNumber(value) / utmValue

  const bracketRows: ChileTaxBracketSnapshot[] = [
    {
      bracketId: `${version}-1`,
      taxTableVersion: version,
      bracketOrder: 1,
      fromUtm: toUtm(payload.TR1Desde),
      toUtm: toUtm(payload.TR1Hasta),
      rate: parseGaelNumber(payload.TR1Factor),
      deductionUtm: toUtm(payload.TR1CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-2`,
      taxTableVersion: version,
      bracketOrder: 2,
      fromUtm: toUtm(payload.TR2Desde),
      toUtm: toUtm(payload.TR2Hasta),
      rate: parseGaelNumber(payload.TR2Factor),
      deductionUtm: toUtm(payload.TR2CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-3`,
      taxTableVersion: version,
      bracketOrder: 3,
      fromUtm: toUtm(payload.TR3Desde),
      toUtm: toUtm(payload.TR3Hasta),
      rate: parseGaelNumber(payload.TR3Factor),
      deductionUtm: toUtm(payload.TR3CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-4`,
      taxTableVersion: version,
      bracketOrder: 4,
      fromUtm: toUtm(payload.TR4Desde),
      toUtm: toUtm(payload.TR4Hasta),
      rate: parseGaelNumber(payload.TR4Factor),
      deductionUtm: toUtm(payload.TR4CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-5`,
      taxTableVersion: version,
      bracketOrder: 5,
      fromUtm: toUtm(payload.TR5Desde),
      toUtm: toUtm(payload.TR5Hasta),
      rate: parseGaelNumber(payload.TR5Factor),
      deductionUtm: toUtm(payload.TR5CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-6`,
      taxTableVersion: version,
      bracketOrder: 6,
      fromUtm: toUtm(payload.TR6Desde),
      toUtm: toUtm(payload.TR6Hasta),
      rate: parseGaelNumber(payload.TR6Factor),
      deductionUtm: toUtm(payload.TR6CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-7`,
      taxTableVersion: version,
      bracketOrder: 7,
      fromUtm: toUtm(payload.TR7Desde),
      toUtm: toUtm(payload.TR7Hasta),
      rate: parseGaelNumber(payload.TR7Factor),
      deductionUtm: toUtm(payload.TR7CReb),
      effectiveFrom
    },
    {
      bracketId: `${version}-8`,
      taxTableVersion: version,
      bracketOrder: 8,
      fromUtm: toUtm(payload.TR8Desde),
      toUtm: null,
      rate: parseGaelNumber(payload.TR8Factor),
      deductionUtm: toUtm(payload.TR8CReb),
      effectiveFrom
    }
  ]

  return {
    version,
    effectiveFrom,
    brackets: bracketRows
  }
}

const upsertPreviredIndicators = async (
  client: PoolClient,
  snapshot: ChilePreviredPeriodSnapshot
) => {
  const indicatorId = `gael-previred-${snapshot.periodYear}-${String(snapshot.periodMonth).padStart(2, '0')}`

  await queryRow(
    client,
    `
      INSERT INTO greenhouse_payroll.chile_previred_indicators (
        period_year,
        period_month,
        imm_clp,
        sis_rate,
        tope_afp_uf,
        tope_cesantia_uf,
        source,
        updated_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (period_year, period_month) DO UPDATE
      SET
        imm_clp = EXCLUDED.imm_clp,
        sis_rate = EXCLUDED.sis_rate,
        tope_afp_uf = EXCLUDED.tope_afp_uf,
        tope_cesantia_uf = EXCLUDED.tope_cesantia_uf,
        source = EXCLUDED.source,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      snapshot.periodYear,
      snapshot.periodMonth,
      snapshot.immClp,
      snapshot.sisRate,
      snapshot.topeAfpUf,
      snapshot.topeCesantiaUf,
      snapshot.source
    ]
  )

  return indicatorId
}

const upsertTaxBrackets = async (
  client: PoolClient,
  version: string,
  brackets: ChileTaxBracketSnapshot[]
) => {
  for (const bracket of brackets) {
    await queryRow(
      client,
      `
        INSERT INTO greenhouse_payroll.chile_tax_brackets (
          bracket_id,
          tax_table_version,
          bracket_order,
          from_utm,
          to_utm,
          rate,
          deduction_utm,
          effective_from,
          effective_to,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, NULL, CURRENT_TIMESTAMP)
        ON CONFLICT (bracket_id) DO UPDATE
        SET
          tax_table_version = EXCLUDED.tax_table_version,
          bracket_order = EXCLUDED.bracket_order,
          from_utm = EXCLUDED.from_utm,
          to_utm = EXCLUDED.to_utm,
          rate = EXCLUDED.rate,
          deduction_utm = EXCLUDED.deduction_utm,
          effective_from = EXCLUDED.effective_from
      `,
      [
        bracket.bracketId,
        version,
        bracket.bracketOrder,
        bracket.fromUtm,
        bracket.toUtm,
        bracket.rate,
        bracket.deductionUtm,
        bracket.effectiveFrom
      ]
    )
  }

  return brackets.length
}

const upsertAfpRates = async (
  client: PoolClient,
  rows: ChileAfpRateSnapshot[]
) => {
  for (const row of rows) {
    await queryRow(
      client,
      `
        INSERT INTO greenhouse_payroll.chile_afp_rates (
          afp_rate_id,
          period_year,
          period_month,
          afp_name,
          worker_rate,
          total_rate,
          source,
          is_active,
          updated_at,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (period_year, period_month, afp_name) DO UPDATE
        SET
          total_rate = EXCLUDED.total_rate,
          source = EXCLUDED.source,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
          row.afpRateId,
          row.periodYear,
          row.periodMonth,
          row.afpName,
          row.workerRate,
          row.totalRate,
          row.source,
          row.isActive
        ]
      )
  }

  return rows.length
}

export const syncGaelPreviredPeriod = async ({
  periodYear,
  periodMonth
}: {
  periodYear: number
  periodMonth: number
}): Promise<PreviredSyncOutcome> => {
  const previredUrl = buildPreviredUrl(periodYear, periodMonth)
  const payload = await fetchGaelJson<GaelPreviredPayload>(previredUrl)

  const snapshot = parsePreviredPayload(payload)
  const afpRates = parsePreviredAfpRates(payload)

  await assertPayrollPostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const indicatorId = await upsertPreviredIndicators(client, snapshot)
    const afpRateCount = await upsertAfpRates(client, afpRates)

    const eventId = await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.payrollPrevisionalSnapshot,
      aggregateId: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
      eventType: EVENT_TYPES.payrollPrevisionalSnapshotUpserted,
      payload: {
        periodYear,
        periodMonth,
        source: SOURCE_LABEL,
        sourceUrl: previredUrl,
        indicatorId,
        indicatorCount: 1,
        afpRateCount,
        taxTableVersion: null
      }
    }, client)

    return {
      previred: {
        status: 'ok' as const,
        sourceUrl: previredUrl,
        rows: 1 + afpRateCount
      },
      impunico: {
        status: 'ok' as const,
        sourceUrl: undefined,
        rows: 0
      },
      eventId,
      utmValue: snapshot.utmValue
    }
  })
}

export const syncGaelImpUnicoPeriod = async ({
  periodYear,
  periodMonth,
  utmValue
}: {
  periodYear: number
  periodMonth: number
  utmValue: number
}) => {
  const impUnicoUrl = buildImpUnicoUrl(periodYear, periodMonth)
  const payload = await fetchGaelJson<GaelImpUnicoPayload>(impUnicoUrl)

  const parsed = parseImpUnicoPayload(payload, utmValue)

  await assertPayrollPostgresReady()

  return withGreenhousePostgresTransaction(async client => {
    const taxCount = await upsertTaxBrackets(client, parsed.version, parsed.brackets)

    return {
      previred: {
        status: 'ok' as const,
        sourceUrl: undefined,
        rows: 0
      },
      impunico: {
        status: 'ok' as const,
        sourceUrl: impUnicoUrl,
        rows: taxCount
      }
    }
  })
}

export const syncChilePrevisionalPeriod = async ({
  periodYear,
  periodMonth
}: {
  periodYear: number
  periodMonth: number
}): Promise<ChilePrevisionalSyncResult> => {
  const start = Date.now()
  const runId = buildPreviredSyncRunId(periodYear, periodMonth)

  let previred: SyncPartStatus = { status: 'error', message: 'Not started' }
  let impunico: SyncPartStatus = { status: 'error', message: 'Not started' }
  let outboxEventId: string | undefined
  let utmValue: number | undefined

  await writePreviredSyncRunStart({ runId, periodYear, periodMonth })

  try {

    const result = await syncGaelPreviredPeriod({ periodYear, periodMonth })

    previred = result.previred
    outboxEventId = result.eventId
    utmValue = result.utmValue
  } catch (error) {
    previred = {
      status: 'error',
      sourceUrl: buildPreviredUrl(periodYear, periodMonth),
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  try {
    if (typeof utmValue !== 'number' || !Number.isFinite(utmValue) || utmValue <= 0) {
      throw new Error('Previred sync did not return a valid UTM value for the period.')
    }

    const result = await syncGaelImpUnicoPeriod({ periodYear, periodMonth, utmValue })

    impunico = result.impunico
  } catch (error) {
    impunico = {
      status: 'error',
      sourceUrl: buildImpUnicoUrl(periodYear, periodMonth),
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const status: PreviredSyncRunStatus =
    previred.status === 'ok' && impunico.status === 'ok'
      ? 'succeeded'
      : previred.status === 'ok' || impunico.status === 'ok'
        ? 'partial'
        : 'failed'

  await writePreviredSyncRunOutcome({
    runId,
    status,
    periodYear,
    periodMonth,
    previred,
    impunico
  })

  return {
    periodYear,
    periodMonth,
    previred,
    impunico,
    durationMs: Date.now() - start,
    outboxEventId
  }
}

const nextPeriod = ({ year, month }: { year: number; month: number }) => {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  return { year: nextYear, month: nextMonth }
}

export const syncChilePrevisionalRange = async ({
  startYear,
  startMonth,
  endYear,
  endMonth
}: {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
}) => {
  const results: ChilePrevisionalSyncResult[] = []
  let current = { year: startYear, month: startMonth }

  while (current.year < endYear || (current.year === endYear && current.month <= endMonth)) {
    results.push(await syncChilePrevisionalPeriod({ periodYear: current.year, periodMonth: current.month }))
    current = nextPeriod(current)
  }

  return results
}
