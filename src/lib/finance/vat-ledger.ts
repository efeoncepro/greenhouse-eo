import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

export const VAT_BUCKETS = ['debit_fiscal', 'credito_fiscal', 'iva_no_recuperable'] as const

export type VatBucket = (typeof VAT_BUCKETS)[number]

export interface VatLedgerEntryRecord {
  ledgerEntryId: string
  periodId: string
  periodYear: number
  periodMonth: number
  spaceId: string
  spaceName: string | null
  sourceKind: 'income' | 'expense'
  sourceId: string
  sourcePublicRef: string | null
  sourceDate: string
  currency: string
  taxCode: string
  taxRecoverability: string | null
  vatBucket: VatBucket
  taxableAmount: number
  amountDocument: number
  amountClp: number
  spaceResolutionSource: string
}

export interface VatMonthlyPositionRecord {
  vatPositionId: string
  periodId: string
  periodYear: number
  periodMonth: number
  spaceId: string
  spaceName: string | null
  debitFiscalAmountClp: number
  creditFiscalAmountClp: number
  nonRecoverableVatAmountClp: number
  netVatPositionClp: number
  debitDocumentCount: number
  creditDocumentCount: number
  nonRecoverableDocumentCount: number
  ledgerEntryCount: number
  materializedAt: string | null
  materializationReason: string | null
}

export interface VatMaterializationSummary {
  periodId: string
  positionsMaterialized: number
  ledgerEntriesMaterialized: number
  debitFiscalAmountClp: number
  creditFiscalAmountClp: number
  nonRecoverableVatAmountClp: number
}

const parsePeriodId = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const parseDateLike = (value: unknown): { year: number; month: number } | null => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

const toInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

const padMonth = (month: number) => String(month).padStart(2, '0')

export const buildVatPeriodId = (year: number, month: number) => `${year}-${padMonth(month)}`

export const getVatLedgerPeriodFromPayload = (payload: Record<string, unknown>) => {
  const explicitYear = toInteger(payload.periodYear) ?? toInteger(payload.year)
  const explicitMonth = toInteger(payload.periodMonth) ?? toInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  return (
    parsePeriodId(payload.periodId) ??
    parseDateLike(payload.invoiceDate) ??
    parseDateLike(payload.documentDate) ??
    parseDateLike(payload.sourceDate) ??
    null
  )
}

export const getVatLedgerScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getVatLedgerPeriodFromPayload(payload)

  if (!period) {
    const current = getFinanceCurrentPeriod()

    return {
      entityType: 'finance_period',
      entityId: buildVatPeriodId(current.year, current.month)
    }
  }

  return {
    entityType: 'finance_period',
    entityId: buildVatPeriodId(period.year, period.month)
  }
}

const mapPositionRow = (row: Record<string, unknown>): VatMonthlyPositionRecord => ({
  vatPositionId: String(row.vat_position_id),
  periodId: String(row.period_id),
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  spaceId: String(row.space_id),
  spaceName: typeof row.space_name === 'string' ? row.space_name : null,
  debitFiscalAmountClp: toNumber(row.debit_fiscal_amount_clp),
  creditFiscalAmountClp: toNumber(row.credit_fiscal_amount_clp),
  nonRecoverableVatAmountClp: toNumber(row.non_recoverable_vat_amount_clp),
  netVatPositionClp: toNumber(row.net_vat_position_clp),
  debitDocumentCount: Number(row.debit_document_count ?? 0),
  creditDocumentCount: Number(row.credit_document_count ?? 0),
  nonRecoverableDocumentCount: Number(row.non_recoverable_document_count ?? 0),
  ledgerEntryCount: Number(row.ledger_entry_count ?? 0),
  materializedAt: typeof row.materialized_at === 'string' ? row.materialized_at : null,
  materializationReason: typeof row.materialization_reason === 'string' ? row.materialization_reason : null
})

const mapEntryRow = (row: Record<string, unknown>): VatLedgerEntryRecord => ({
  ledgerEntryId: String(row.ledger_entry_id),
  periodId: String(row.period_id),
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  spaceId: String(row.space_id),
  spaceName: typeof row.space_name === 'string' ? row.space_name : null,
  sourceKind: String(row.source_kind) as 'income' | 'expense',
  sourceId: String(row.source_id),
  sourcePublicRef: typeof row.source_public_ref === 'string' ? row.source_public_ref : null,
  sourceDate: String(row.source_date),
  currency: String(row.currency),
  taxCode: String(row.tax_code),
  taxRecoverability: typeof row.tax_recoverability === 'string' ? row.tax_recoverability : null,
  vatBucket: String(row.vat_bucket) as VatBucket,
  taxableAmount: toNumber(row.taxable_amount),
  amountDocument: toNumber(row.amount_document),
  amountClp: toNumber(row.amount_clp),
  spaceResolutionSource: String(row.space_resolution_source)
})

export async function materializeVatLedgerForPeriod(
  year: number,
  month: number,
  reason: string
): Promise<VatMaterializationSummary> {
  const db = await getDb()
  const periodId = buildVatPeriodId(year, month)

  await db.transaction().execute(async trx => {
    await sql`
      DELETE FROM greenhouse_finance.vat_monthly_positions
      WHERE period_year = ${year} AND period_month = ${month}
    `.execute(trx)

    await sql`
      DELETE FROM greenhouse_finance.vat_ledger_entries
      WHERE period_year = ${year} AND period_month = ${month}
    `.execute(trx)

    await sql`
      WITH client_bridge AS (
        SELECT DISTINCT ON (s.client_id)
          s.client_id,
          s.space_id,
          s.organization_id
        FROM greenhouse_core.spaces s
        WHERE s.client_id IS NOT NULL
          AND s.active = TRUE
        ORDER BY s.client_id, s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
      ),
      scoped_income AS (
        SELECT
          i.income_id,
          COALESCE(q.space_id, cb.space_id) AS space_id,
          COALESCE(i.organization_id, cp.organization_id, q.organization_id, cb.organization_id) AS organization_id,
          COALESCE(i.client_id, cp.client_id) AS client_id,
          COALESCE(NULLIF(TRIM(i.invoice_number), ''), NULLIF(TRIM(i.dte_folio), ''), i.income_id) AS source_public_ref,
          COALESCE(i.invoice_date::date, i.created_at::date) AS source_date,
          i.currency,
          i.exchange_rate_to_clp,
          i.tax_code,
          i.tax_snapshot_json,
          COALESCE((i.tax_snapshot_json ->> 'taxableAmount')::numeric, i.subtotal, 0) AS taxable_amount,
          COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) AS tax_amount_document,
          CASE
            WHEN q.space_id IS NOT NULL THEN 'quotation'
            ELSE 'client_bridge'
          END AS space_resolution_source
        FROM greenhouse_finance.income i
        LEFT JOIN greenhouse_finance.client_profiles cp
          ON cp.client_profile_id = i.client_profile_id
        LEFT JOIN greenhouse_commercial.quotations q
          ON q.quotation_id = i.quotation_id
        LEFT JOIN client_bridge cb
          ON cb.client_id = COALESCE(i.client_id, cp.client_id)
        WHERE i.period_year = ${year}
          AND i.period_month = ${month}
          AND COALESCE(i.tax_snapshot_json ->> 'kind', '') = 'vat_output'
          AND COALESCE(i.tax_amount_snapshot, i.tax_amount, 0) > 0
          AND COALESCE(q.space_id, cb.space_id) IS NOT NULL
      )
      INSERT INTO greenhouse_finance.vat_ledger_entries (
        ledger_entry_id,
        period_year,
        period_month,
        period_id,
        space_id,
        organization_id,
        client_id,
        source_kind,
        source_id,
        source_public_ref,
        source_date,
        currency,
        exchange_rate_to_clp,
        tax_code,
        tax_snapshot_json,
        tax_recoverability,
        vat_bucket,
        taxable_amount,
        amount_document,
        amount_clp,
        space_resolution_source,
        metadata
      )
      SELECT
        'EO-VLE-' || upper(substr(md5(concat_ws(':', 'income', income_id, 'debit_fiscal')), 1, 8)),
        ${year},
        ${month},
        ${periodId},
        space_id,
        organization_id,
        client_id,
        'income',
        income_id,
        source_public_ref,
        source_date,
        currency,
        exchange_rate_to_clp,
        tax_code,
        tax_snapshot_json,
        NULL,
        'debit_fiscal',
        ROUND(taxable_amount, 2),
        ROUND(tax_amount_document, 2),
        ROUND(
          CASE
            WHEN currency = 'CLP' THEN tax_amount_document
            ELSE tax_amount_document * COALESCE(NULLIF(exchange_rate_to_clp, 0), 1)
          END,
          2
        ),
        space_resolution_source,
        jsonb_build_object(
          'materializationReason', ${reason},
          'sourceTaxKind', COALESCE(tax_snapshot_json ->> 'kind', 'vat_output')
        )
      FROM scoped_income
    `.execute(trx)

    await sql`
      WITH client_bridge AS (
        SELECT DISTINCT ON (s.client_id)
          s.client_id,
          s.organization_id
        FROM greenhouse_core.spaces s
        WHERE s.client_id IS NOT NULL
          AND s.active = TRUE
        ORDER BY s.client_id, s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
      ),
      scoped_expense AS (
        SELECT
          e.expense_id,
          e.space_id,
          COALESCE(sp.organization_id, cb.organization_id) AS organization_id,
          COALESCE(e.allocated_client_id, e.client_id) AS client_id,
          COALESCE(
            NULLIF(TRIM(e.document_number), ''),
            NULLIF(TRIM(e.supplier_invoice_number), ''),
            e.expense_id
          ) AS source_public_ref,
          COALESCE(e.document_date::date, e.created_at::date) AS source_date,
          e.currency,
          e.exchange_rate_to_clp,
          e.tax_code,
          e.tax_snapshot_json,
          e.tax_recoverability,
          COALESCE((e.tax_snapshot_json ->> 'taxableAmount')::numeric, e.subtotal, 0) AS taxable_amount,
          COALESCE(e.recoverable_tax_amount, 0) AS recoverable_tax_amount,
          COALESCE(
            e.recoverable_tax_amount_clp,
            CASE
              WHEN e.currency = 'CLP' THEN COALESCE(e.recoverable_tax_amount, 0)
              ELSE COALESCE(e.recoverable_tax_amount, 0) * COALESCE(NULLIF(e.exchange_rate_to_clp, 0), 1)
            END
          ) AS recoverable_tax_amount_clp,
          COALESCE(e.non_recoverable_tax_amount, 0) AS non_recoverable_tax_amount,
          COALESCE(
            e.non_recoverable_tax_amount_clp,
            CASE
              WHEN e.currency = 'CLP' THEN COALESCE(e.non_recoverable_tax_amount, 0)
              ELSE COALESCE(e.non_recoverable_tax_amount, 0) * COALESCE(NULLIF(e.exchange_rate_to_clp, 0), 1)
            END
          ) AS non_recoverable_tax_amount_clp
        FROM greenhouse_finance.expenses e
        LEFT JOIN greenhouse_core.spaces sp
          ON sp.space_id = e.space_id
        LEFT JOIN client_bridge cb
          ON cb.client_id = COALESCE(e.allocated_client_id, e.client_id)
        WHERE e.period_year = ${year}
          AND e.period_month = ${month}
          AND e.space_id IS NOT NULL
          AND (
            COALESCE(e.recoverable_tax_amount, 0) > 0
            OR COALESCE(e.non_recoverable_tax_amount, 0) > 0
          )
      )
      INSERT INTO greenhouse_finance.vat_ledger_entries (
        ledger_entry_id,
        period_year,
        period_month,
        period_id,
        space_id,
        organization_id,
        client_id,
        source_kind,
        source_id,
        source_public_ref,
        source_date,
        currency,
        exchange_rate_to_clp,
        tax_code,
        tax_snapshot_json,
        tax_recoverability,
        vat_bucket,
        taxable_amount,
        amount_document,
        amount_clp,
        space_resolution_source,
        metadata
      )
      SELECT
        'EO-VLE-' || upper(substr(md5(concat_ws(':', 'expense', expense_id, vat_bucket)), 1, 8)),
        ${year},
        ${month},
        ${periodId},
        space_id,
        organization_id,
        client_id,
        'expense',
        expense_id,
        source_public_ref,
        source_date,
        currency,
        exchange_rate_to_clp,
        tax_code,
        tax_snapshot_json,
        tax_recoverability,
        vat_bucket,
        ROUND(taxable_amount, 2),
        ROUND(amount_document, 2),
        ROUND(amount_clp, 2),
        'expense',
        jsonb_build_object(
          'materializationReason', ${reason},
          'sourceTaxKind', COALESCE(tax_snapshot_json ->> 'kind', 'vat_input_credit')
        )
      FROM (
        SELECT
          expense_id,
          space_id,
          organization_id,
          client_id,
          source_public_ref,
          source_date,
          currency,
          exchange_rate_to_clp,
          tax_code,
          tax_snapshot_json,
          tax_recoverability,
          taxable_amount,
          'credito_fiscal'::text AS vat_bucket,
          recoverable_tax_amount AS amount_document,
          recoverable_tax_amount_clp AS amount_clp
        FROM scoped_expense
        WHERE recoverable_tax_amount > 0

        UNION ALL

        SELECT
          expense_id,
          space_id,
          organization_id,
          client_id,
          source_public_ref,
          source_date,
          currency,
          exchange_rate_to_clp,
          tax_code,
          tax_snapshot_json,
          tax_recoverability,
          taxable_amount,
          'iva_no_recuperable'::text AS vat_bucket,
          non_recoverable_tax_amount AS amount_document,
          non_recoverable_tax_amount_clp AS amount_clp
        FROM scoped_expense
        WHERE non_recoverable_tax_amount > 0
      ) scoped_rows
    `.execute(trx)

    await sql`
      WITH aggregated AS (
        SELECT
          e.space_id,
          MAX(e.organization_id) AS organization_id,
          MAX(e.client_id) AS client_id,
          COALESCE(SUM(CASE WHEN e.vat_bucket = 'debit_fiscal' THEN e.amount_clp ELSE 0 END), 0) AS debit_fiscal_amount_clp,
          COALESCE(SUM(CASE WHEN e.vat_bucket = 'credito_fiscal' THEN e.amount_clp ELSE 0 END), 0) AS credit_fiscal_amount_clp,
          COALESCE(SUM(CASE WHEN e.vat_bucket = 'iva_no_recuperable' THEN e.amount_clp ELSE 0 END), 0) AS non_recoverable_vat_amount_clp,
          COUNT(DISTINCT CASE WHEN e.vat_bucket = 'debit_fiscal' THEN e.source_id END) AS debit_document_count,
          COUNT(DISTINCT CASE WHEN e.vat_bucket = 'credito_fiscal' THEN e.source_id END) AS credit_document_count,
          COUNT(DISTINCT CASE WHEN e.vat_bucket = 'iva_no_recuperable' THEN e.source_id END) AS non_recoverable_document_count,
          COUNT(*) AS ledger_entry_count
        FROM greenhouse_finance.vat_ledger_entries e
        WHERE e.period_year = ${year}
          AND e.period_month = ${month}
        GROUP BY e.space_id
      )
      INSERT INTO greenhouse_finance.vat_monthly_positions (
        vat_position_id,
        period_year,
        period_month,
        period_id,
        space_id,
        organization_id,
        client_id,
        debit_fiscal_amount_clp,
        credit_fiscal_amount_clp,
        non_recoverable_vat_amount_clp,
        net_vat_position_clp,
        debit_document_count,
        credit_document_count,
        non_recoverable_document_count,
        ledger_entry_count,
        materialized_at,
        materialization_reason,
        metadata
      )
      SELECT
        'EO-VMP-' || upper(substr(md5(concat_ws(':', space_id, ${periodId})), 1, 8)),
        ${year},
        ${month},
        ${periodId},
        space_id,
        organization_id,
        client_id,
        ROUND(debit_fiscal_amount_clp, 2),
        ROUND(credit_fiscal_amount_clp, 2),
        ROUND(non_recoverable_vat_amount_clp, 2),
        ROUND(debit_fiscal_amount_clp - credit_fiscal_amount_clp, 2),
        debit_document_count,
        credit_document_count,
        non_recoverable_document_count,
        ledger_entry_count,
        CURRENT_TIMESTAMP,
        ${reason},
        jsonb_build_object(
          'periodId', ${periodId},
          'materializationReason', ${reason}
        )
      FROM aggregated
    `.execute(trx)
  })

  const summaryResult = await sql<{
    positions_materialized: number
    ledger_entries_materialized: number
    debit_fiscal_amount_clp: string | number | null
    credit_fiscal_amount_clp: string | number | null
    non_recoverable_vat_amount_clp: string | number | null
  }>`
    SELECT
      COUNT(DISTINCT p.space_id)::int AS positions_materialized,
      COALESCE(SUM(p.ledger_entry_count), 0)::int AS ledger_entries_materialized,
      COALESCE(SUM(p.debit_fiscal_amount_clp), 0) AS debit_fiscal_amount_clp,
      COALESCE(SUM(p.credit_fiscal_amount_clp), 0) AS credit_fiscal_amount_clp,
      COALESCE(SUM(p.non_recoverable_vat_amount_clp), 0) AS non_recoverable_vat_amount_clp
    FROM greenhouse_finance.vat_monthly_positions p
    WHERE p.period_year = ${year}
      AND p.period_month = ${month}
  `.execute(db)

  const summary = summaryResult.rows[0]

  return {
    periodId,
    positionsMaterialized: Number(summary?.positions_materialized ?? 0),
    ledgerEntriesMaterialized: Number(summary?.ledger_entries_materialized ?? 0),
    debitFiscalAmountClp: roundCurrency(toNumber(summary?.debit_fiscal_amount_clp)),
    creditFiscalAmountClp: roundCurrency(toNumber(summary?.credit_fiscal_amount_clp)),
    nonRecoverableVatAmountClp: roundCurrency(toNumber(summary?.non_recoverable_vat_amount_clp))
  }
}

export async function materializeAllAvailableVatPeriods(reason: string) {
  const db = await getDb()

  const periodRows = await sql<{ period_year: number; period_month: number }>`
    WITH income_periods AS (
      SELECT DISTINCT period_year, period_month
      FROM greenhouse_finance.income
      WHERE period_year IS NOT NULL
        AND period_month IS NOT NULL
        AND COALESCE(tax_snapshot_json ->> 'kind', '') = 'vat_output'
        AND COALESCE(tax_amount_snapshot, tax_amount, 0) > 0
    ),
    expense_periods AS (
      SELECT DISTINCT period_year, period_month
      FROM greenhouse_finance.expenses
      WHERE period_year IS NOT NULL
        AND period_month IS NOT NULL
        AND (
          COALESCE(recoverable_tax_amount, 0) > 0
          OR COALESCE(non_recoverable_tax_amount, 0) > 0
        )
    )
    SELECT DISTINCT period_year, period_month
    FROM (
      SELECT period_year, period_month FROM income_periods
      UNION
      SELECT period_year, period_month FROM expense_periods
    ) periods
    ORDER BY period_year ASC, period_month ASC
  `.execute(db)

  const summaries: VatMaterializationSummary[] = []

  for (const period of periodRows.rows) {
    summaries.push(await materializeVatLedgerForPeriod(Number(period.period_year), Number(period.period_month), reason))
  }

  return {
    periods: summaries.length,
    summaries
  }
}

export async function getVatMonthlyPosition(params: {
  spaceId: string
  year: number
  month: number
}): Promise<VatMonthlyPositionRecord | null> {
  const db = await getDb()

  const result = await sql<Record<string, unknown>>`
    SELECT
      p.vat_position_id,
      p.period_id,
      p.period_year,
      p.period_month,
      p.space_id,
      s.space_name,
      p.debit_fiscal_amount_clp,
      p.credit_fiscal_amount_clp,
      p.non_recoverable_vat_amount_clp,
      p.net_vat_position_clp,
      p.debit_document_count,
      p.credit_document_count,
      p.non_recoverable_document_count,
      p.ledger_entry_count,
      p.materialized_at::text AS materialized_at,
      p.materialization_reason
    FROM greenhouse_finance.vat_monthly_positions p
    LEFT JOIN greenhouse_core.spaces s
      ON s.space_id = p.space_id
    WHERE p.space_id = ${params.spaceId}
      AND p.period_year = ${params.year}
      AND p.period_month = ${params.month}
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapPositionRow(result.rows[0]) : null
}

export async function listVatMonthlyPositions(params: {
  spaceId: string
  limit?: number
}): Promise<VatMonthlyPositionRecord[]> {
  const db = await getDb()
  const limit = Math.max(1, Math.min(params.limit ?? 6, 24))

  const result = await sql<Record<string, unknown>>`
    SELECT
      p.vat_position_id,
      p.period_id,
      p.period_year,
      p.period_month,
      p.space_id,
      s.space_name,
      p.debit_fiscal_amount_clp,
      p.credit_fiscal_amount_clp,
      p.non_recoverable_vat_amount_clp,
      p.net_vat_position_clp,
      p.debit_document_count,
      p.credit_document_count,
      p.non_recoverable_document_count,
      p.ledger_entry_count,
      p.materialized_at::text AS materialized_at,
      p.materialization_reason
    FROM greenhouse_finance.vat_monthly_positions p
    LEFT JOIN greenhouse_core.spaces s
      ON s.space_id = p.space_id
    WHERE p.space_id = ${params.spaceId}
    ORDER BY p.period_year DESC, p.period_month DESC
    LIMIT ${limit}
  `.execute(db)

  return result.rows.map(mapPositionRow)
}

export async function listVatLedgerEntries(params: {
  spaceId: string
  year: number
  month: number
}): Promise<VatLedgerEntryRecord[]> {
  const db = await getDb()

  const result = await sql<Record<string, unknown>>`
    SELECT
      e.ledger_entry_id,
      e.period_id,
      e.period_year,
      e.period_month,
      e.space_id,
      s.space_name,
      e.source_kind,
      e.source_id,
      e.source_public_ref,
      e.source_date::text AS source_date,
      e.currency,
      e.tax_code,
      e.tax_recoverability,
      e.vat_bucket,
      e.taxable_amount,
      e.amount_document,
      e.amount_clp,
      e.space_resolution_source
    FROM greenhouse_finance.vat_ledger_entries e
    LEFT JOIN greenhouse_core.spaces s
      ON s.space_id = e.space_id
    WHERE e.space_id = ${params.spaceId}
      AND e.period_year = ${params.year}
      AND e.period_month = ${params.month}
    ORDER BY
      CASE e.vat_bucket
        WHEN 'debit_fiscal' THEN 0
        WHEN 'credito_fiscal' THEN 1
        ELSE 2
      END,
      e.source_date DESC,
      e.source_public_ref ASC
  `.execute(db)

  return result.rows.map(mapEntryRow)
}
