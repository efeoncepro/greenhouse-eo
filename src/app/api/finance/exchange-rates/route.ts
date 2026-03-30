import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  assertValidCurrency,
  assertDateString,
  assertPositiveAmount,
  normalizeString,
  FinanceValidationError,
  runFinanceQuery,
  getFinanceProjectId,
  toDateString,
  toNumber,
  toTimestampString
} from '@/lib/finance/shared'
import {
  listFinanceExchangeRatesFromPostgres,
  shouldFallbackFromFinancePostgres,
  upsertFinanceExchangeRateInPostgres
} from '@/lib/finance/postgres-store'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { isFinanceBigQueryWriteEnabled } from '@/lib/finance/bigquery-write-flag'

export const dynamic = 'force-dynamic'

interface ExchangeRateRow {
  rate_id: string
  from_currency: string
  to_currency: string
  rate: unknown
  rate_date: unknown
  source: string | null
  created_at: unknown
}

const normalizeRate = (row: ExchangeRateRow) => ({
  rateId: normalizeString(row.rate_id),
  fromCurrency: normalizeString(row.from_currency),
  toCurrency: normalizeString(row.to_currency),
  rate: toNumber(row.rate),
  rateDate: toDateString(row.rate_date as string | { value?: string } | null),
  source: row.source ? normalizeString(row.source) : 'manual',
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null)
})

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')

  // ── Postgres-first path ──
  try {
    const items = await listFinanceExchangeRatesFromPostgres({ fromDate, toDate })

    return NextResponse.json({
      items,
      total: items.length
    })
  } catch (error) {
    if (!shouldFallbackFromFinancePostgres(error)) {
      throw error
    }
  }

  // ── BigQuery fallback ──
  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  let dateFilter = ''
  const params: Record<string, unknown> = {}

  if (fromDate) {
    dateFilter += ' AND rate_date >= @fromDate'
    params.fromDate = fromDate
  }

  if (toDate) {
    dateFilter += ' AND rate_date <= @toDate'
    params.toDate = toDate
  }

  const rows = await runFinanceQuery<ExchangeRateRow>(`
    SELECT rate_id, from_currency, to_currency, rate, rate_date, source, created_at
    FROM \`${projectId}.greenhouse.fin_exchange_rates\`
    WHERE TRUE ${dateFilter}
    ORDER BY rate_date DESC
    LIMIT 200
  `, params)

  return NextResponse.json({
    items: rows.map(normalizeRate),
    total: rows.length
  })
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const fromCurrency = assertValidCurrency(body.fromCurrency)
    const toCurrency = assertValidCurrency(body.toCurrency)
    const rateDate = assertDateString(body.rateDate, 'rateDate')
    const rate = assertPositiveAmount(toNumber(body.rate), 'rate')

    if (rate === 0) {
      throw new FinanceValidationError('Exchange rate must be greater than zero.')
    }

    if (fromCurrency === toCurrency) {
      throw new FinanceValidationError('fromCurrency and toCurrency must be different.')
    }

    const source = normalizeString(body.source) || 'manual'
    const rateId = `${fromCurrency}_${toCurrency}_${rateDate}`

    try {
      await upsertFinanceExchangeRateInPostgres({
        rateId,
        fromCurrency,
        toCurrency,
        rate,
        rateDate,
        source
      })
    } catch (error) {
      if (!shouldFallbackFromFinancePostgres(error)) {
        throw error
      }

      if (!isFinanceBigQueryWriteEnabled()) {
        return NextResponse.json(
          {
            error: 'Finance BigQuery fallback write is disabled. Postgres write path failed.',
            code: 'FINANCE_BQ_WRITE_DISABLED'
          },
          { status: 503 }
        )
      }

      await ensureFinanceInfrastructure()
      const projectId = getFinanceProjectId()

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
      `, {
        rateId,
        fromCurrency,
        toCurrency,
        rate,
        rateDate,
        source
      })
    }

    return NextResponse.json({ rateId, created: true }, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
