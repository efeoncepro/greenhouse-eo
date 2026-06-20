import 'server-only'

import { sql } from 'kysely'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { getDb } from '@/lib/db'
import { roundCurrency, toNumber } from '@/lib/finance/shared'
import { getSiiRetentionRate } from '@/types/hr-contracts'

/**
 * TASK-1188 — Posición mensual de RETENCIONES (línea retenciones del F29) por
 * entidad legal. Mirror del patrón VAT (TASK-725 `vat-ledger.ts`).
 *
 * Source-of-truth (decisión Slice 1, evidencia BD viva): la posición se
 * materializa desde las **boletas de honorarios (BHE) recibidas**
 * (`greenhouse_finance.expenses.withholding_amount > 0`) — el instrumento legal
 * declarado al SII, en su período de emisión. NO se suma `payroll_entries`
 * (honorarios internos) porque doble-contaría: un mismo honorario aparece en
 * ambas fuentes (payroll + BHE). El gap inverso (honorario de payroll sin BHE
 * sincronizada = sub-declaración) se cubre con un signal aparte, no sumándolo.
 *
 * Scope fiscal = operating entity (`organization_id`), NUNCA `space_id`. Tasa de
 * referencia desde `SII_RETENTION_RATES` (versionada). Advisory lock por período
 * desde el inicio (lección TASK-1185).
 */

export const RETENTION_BUCKETS = ['honorarios', 'segunda_categoria'] as const

export type RetentionBucket = (typeof RETENTION_BUCKETS)[number]

export interface RetentionLedgerEntryRecord {
  retentionEntryId: string
  periodId: string
  periodYear: number
  periodMonth: number
  sourceKind: 'payroll_honorarios' | 'expense_bhe'
  sourceId: string
  sourcePublicRef: string | null
  counterpartyName: string | null
  sourceDate: string
  currency: string
  retentionBucket: RetentionBucket
  retentionRate: number | null
  grossAmount: number
  retentionAmount: number
  retentionAmountClp: number
  dedupStatus: 'counted' | 'superseded'
}

export interface RetentionMonthlyPositionRecord {
  retentionPositionId: string
  periodId: string
  periodYear: number
  periodMonth: number
  organizationId: string | null
  totalRetentionAmountClp: number
  honorariosRetentionAmountClp: number
  segundaCategoriaRetentionAmountClp: number
  grossBaseAmountClp: number
  documentCount: number
  ledgerEntryCount: number
  materializedAt: string | null
  materializationReason: string | null
}

export interface RetentionMaterializationSummary {
  periodId: string
  positionsMaterialized: number
  ledgerEntriesMaterialized: number
  totalRetentionAmountClp: number
}

const padMonth = (month: number) => String(month).padStart(2, '0')

export const buildRetentionPeriodId = (year: number, month: number) => `${year}-${padMonth(month)}`

const mapPositionRow = (row: Record<string, unknown>): RetentionMonthlyPositionRecord => ({
  retentionPositionId: String(row.retention_position_id),
  periodId: String(row.period_id),
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  organizationId: row.organization_id == null ? null : String(row.organization_id),
  totalRetentionAmountClp: toNumber(row.total_retention_amount_clp),
  honorariosRetentionAmountClp: toNumber(row.honorarios_retention_amount_clp),
  segundaCategoriaRetentionAmountClp: toNumber(row.segunda_categoria_retention_amount_clp),
  grossBaseAmountClp: toNumber(row.gross_base_amount_clp),
  documentCount: Number(row.document_count ?? 0),
  ledgerEntryCount: Number(row.ledger_entry_count ?? 0),
  materializedAt: typeof row.materialized_at === 'string' ? row.materialized_at : null,
  materializationReason: typeof row.materialization_reason === 'string' ? row.materialization_reason : null
})

const mapEntryRow = (row: Record<string, unknown>): RetentionLedgerEntryRecord => ({
  retentionEntryId: String(row.retention_entry_id),
  periodId: String(row.period_id),
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  sourceKind: String(row.source_kind) as 'payroll_honorarios' | 'expense_bhe',
  sourceId: String(row.source_id),
  sourcePublicRef: typeof row.source_public_ref === 'string' ? row.source_public_ref : null,
  counterpartyName: typeof row.counterparty_name === 'string' ? row.counterparty_name : null,
  sourceDate: String(row.source_date),
  currency: String(row.currency),
  retentionBucket: String(row.retention_bucket) as RetentionBucket,
  retentionRate: row.retention_rate == null ? null : toNumber(row.retention_rate),
  grossAmount: toNumber(row.gross_amount),
  retentionAmount: toNumber(row.retention_amount),
  retentionAmountClp: toNumber(row.retention_amount_clp),
  dedupStatus: String(row.dedup_status) as 'counted' | 'superseded'
})

export async function materializeRetentionLedgerForPeriod(
  year: number,
  month: number,
  reason: string
): Promise<RetentionMaterializationSummary> {
  const db = await getDb()
  const periodId = buildRetentionPeriodId(year, month)

  // TASK-725 — scope fiscal = entidad legal (operating entity). Sin declarante no
  // hay posición posible → fail-fast.
  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    throw new Error(
      'TASK-1188 retention materialization: no operating entity (is_operating_entity=TRUE) configured. Cannot scope the fiscal position.'
    )
  }

  const legalEntityOrgId = operatingEntity.organizationId
  // Tasa de referencia versionada (audit). El monto efectivo es el del documento
  // (withholding_amount), no se recomputa con la tasa — la tasa queda como evidencia.
  const referenceRate = getSiiRetentionRate(year)

  await db.transaction().execute(async trx => {
    // Advisory lock por período (lección TASK-1185): serializa materializaciones
    // concurrentes del mismo período (DELETE+INSERT no atómico entre sí).
    await sql`
      SELECT pg_advisory_xact_lock(hashtext('retention_materialize'), hashtext(${periodId}::text))
    `.execute(trx)

    await sql`
      DELETE FROM greenhouse_finance.retention_monthly_positions
      WHERE period_year = ${year}::int AND period_month = ${month}::int
    `.execute(trx)

    await sql`
      DELETE FROM greenhouse_finance.retention_ledger_entries
      WHERE period_year = ${year}::int AND period_month = ${month}::int
    `.execute(trx)

    await sql`
      WITH scoped_bhe AS (
        SELECT
          e.expense_id,
          e.nubox_supplier_rut AS counterparty_rut,
          e.supplier_name AS counterparty_name,
          COALESCE(NULLIF(TRIM(e.document_number), ''), NULLIF(TRIM(e.dte_folio), ''), e.expense_id) AS source_public_ref,
          COALESCE(e.document_date::date, e.created_at::date) AS source_date,
          e.currency,
          e.exchange_rate_to_clp,
          COALESCE(e.subtotal, 0) AS gross_amount,
          COALESCE(e.withholding_amount, 0) AS retention_amount
        FROM greenhouse_finance.expenses e
        WHERE e.period_year = ${year}::int
          AND e.period_month = ${month}::int
          AND COALESCE(e.withholding_amount, 0) > 0
          -- TASK-1185 guard FX: NO materializar retención no-CLP con FX nulo/0
          -- (honorarios son CLP; este guard evita la sub-declaración ×1 silenciosa).
          AND (e.currency = 'CLP' OR COALESCE(NULLIF(e.exchange_rate_to_clp, 0), 0) <> 0)
      )
      INSERT INTO greenhouse_finance.retention_ledger_entries (
        retention_entry_id,
        period_year,
        period_month,
        period_id,
        organization_id,
        source_kind,
        source_id,
        source_public_ref,
        counterparty_rut,
        counterparty_name,
        source_date,
        currency,
        exchange_rate_to_clp,
        retention_bucket,
        retention_rate,
        gross_amount,
        retention_amount,
        retention_amount_clp,
        dedup_status,
        metadata
      )
      SELECT
        'EO-RLE-' || upper(substr(md5(concat_ws(':', 'expense_bhe', expense_id, ${periodId}::text)), 1, 8)),
        ${year}::int,
        ${month}::int,
        ${periodId}::text,
        ${legalEntityOrgId}::text,
        'expense_bhe',
        expense_id,
        source_public_ref,
        counterparty_rut,
        counterparty_name,
        source_date,
        currency,
        exchange_rate_to_clp,
        'honorarios',
        ${referenceRate}::numeric,
        ROUND(gross_amount, 2),
        ROUND(retention_amount, 2),
        ROUND(
          CASE
            WHEN currency = 'CLP' THEN retention_amount
            ELSE retention_amount * COALESCE(NULLIF(exchange_rate_to_clp, 0), 1)
          END,
          2
        ),
        'counted',
        jsonb_build_object(
          'materializationReason', ${reason}::text,
          'sourceTaxKind', 'sii_withholding'
        )
      FROM scoped_bhe
    `.execute(trx)

    await sql`
      WITH aggregated AS (
        SELECT
          e.organization_id,
          COALESCE(SUM(e.retention_amount_clp), 0) AS total_retention_amount_clp,
          COALESCE(SUM(CASE WHEN e.retention_bucket = 'honorarios' THEN e.retention_amount_clp ELSE 0 END), 0) AS honorarios_retention_amount_clp,
          COALESCE(SUM(CASE WHEN e.retention_bucket = 'segunda_categoria' THEN e.retention_amount_clp ELSE 0 END), 0) AS segunda_categoria_retention_amount_clp,
          COALESCE(SUM(
            CASE
              WHEN e.currency = 'CLP' THEN e.gross_amount
              ELSE e.gross_amount * COALESCE(NULLIF(e.exchange_rate_to_clp, 0), 1)
            END
          ), 0) AS gross_base_amount_clp,
          COUNT(DISTINCT e.source_id) AS document_count,
          COUNT(*) AS ledger_entry_count
        FROM greenhouse_finance.retention_ledger_entries e
        WHERE e.period_year = ${year}::int
          AND e.period_month = ${month}::int
          AND e.dedup_status = 'counted'
        GROUP BY e.organization_id
      )
      INSERT INTO greenhouse_finance.retention_monthly_positions (
        retention_position_id,
        period_year,
        period_month,
        period_id,
        organization_id,
        total_retention_amount_clp,
        honorarios_retention_amount_clp,
        segunda_categoria_retention_amount_clp,
        gross_base_amount_clp,
        document_count,
        ledger_entry_count,
        materialized_at,
        materialization_reason,
        metadata
      )
      SELECT
        'EO-RMP-' || upper(substr(md5(concat_ws(':', organization_id, ${periodId}::text)), 1, 8)),
        ${year}::int,
        ${month}::int,
        ${periodId}::text,
        organization_id,
        ROUND(total_retention_amount_clp, 2),
        ROUND(honorarios_retention_amount_clp, 2),
        ROUND(segunda_categoria_retention_amount_clp, 2),
        ROUND(gross_base_amount_clp, 2),
        document_count,
        ledger_entry_count,
        CURRENT_TIMESTAMP,
        ${reason}::text,
        jsonb_build_object('periodId', ${periodId}::text, 'materializationReason', ${reason}::text)
      FROM aggregated
    `.execute(trx)
  })

  const summaryResult = await sql<{
    positions_materialized: number
    ledger_entries_materialized: number
    total_retention_amount_clp: string | number | null
  }>`
    SELECT
      COUNT(*)::int AS positions_materialized,
      COALESCE(SUM(p.ledger_entry_count), 0)::int AS ledger_entries_materialized,
      COALESCE(SUM(p.total_retention_amount_clp), 0) AS total_retention_amount_clp
    FROM greenhouse_finance.retention_monthly_positions p
    WHERE p.period_year = ${year}::int
      AND p.period_month = ${month}::int
  `.execute(db)

  const summary = summaryResult.rows[0]

  return {
    periodId,
    positionsMaterialized: Number(summary?.positions_materialized ?? 0),
    ledgerEntriesMaterialized: Number(summary?.ledger_entries_materialized ?? 0),
    totalRetentionAmountClp: roundCurrency(toNumber(summary?.total_retention_amount_clp))
  }
}

export async function materializeAllAvailableRetentionPeriods(reason: string) {
  const db = await getDb()

  const periodRows = await sql<{ period_year: number; period_month: number }>`
    SELECT DISTINCT period_year, period_month
    FROM greenhouse_finance.expenses
    WHERE period_year IS NOT NULL
      AND period_month IS NOT NULL
      AND COALESCE(withholding_amount, 0) > 0
    ORDER BY period_year ASC, period_month ASC
  `.execute(db)

  const summaries: RetentionMaterializationSummary[] = []

  for (const period of periodRows.rows) {
    summaries.push(
      await materializeRetentionLedgerForPeriod(Number(period.period_year), Number(period.period_month), reason)
    )
  }

  return { periods: summaries.length, summaries }
}

export async function getRetentionMonthlyPosition(params: {
  legalEntityOrganizationId: string
  year: number
  month: number
}): Promise<RetentionMonthlyPositionRecord | null> {
  const db = await getDb()

  const result = await sql<Record<string, unknown>>`
    SELECT
      p.retention_position_id,
      p.period_id,
      p.period_year,
      p.period_month,
      p.organization_id,
      p.total_retention_amount_clp,
      p.honorarios_retention_amount_clp,
      p.segunda_categoria_retention_amount_clp,
      p.gross_base_amount_clp,
      p.document_count,
      p.ledger_entry_count,
      p.materialized_at::text AS materialized_at,
      p.materialization_reason
    FROM greenhouse_finance.retention_monthly_positions p
    WHERE p.organization_id = ${params.legalEntityOrganizationId}
      AND p.period_year = ${params.year}
      AND p.period_month = ${params.month}
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapPositionRow(result.rows[0]) : null
}

export async function listRetentionMonthlyPositions(params: {
  legalEntityOrganizationId: string
  limit?: number
}): Promise<RetentionMonthlyPositionRecord[]> {
  const db = await getDb()
  const limit = Math.max(1, Math.min(params.limit ?? 6, 24))

  const result = await sql<Record<string, unknown>>`
    SELECT
      p.retention_position_id,
      p.period_id,
      p.period_year,
      p.period_month,
      p.organization_id,
      p.total_retention_amount_clp,
      p.honorarios_retention_amount_clp,
      p.segunda_categoria_retention_amount_clp,
      p.gross_base_amount_clp,
      p.document_count,
      p.ledger_entry_count,
      p.materialized_at::text AS materialized_at,
      p.materialization_reason
    FROM greenhouse_finance.retention_monthly_positions p
    WHERE p.organization_id = ${params.legalEntityOrganizationId}
    ORDER BY p.period_year DESC, p.period_month DESC
    LIMIT ${limit}
  `.execute(db)

  return result.rows.map(mapPositionRow)
}

export async function listRetentionLedgerEntries(params: {
  legalEntityOrganizationId: string
  year: number
  month: number
}): Promise<RetentionLedgerEntryRecord[]> {
  const db = await getDb()

  const result = await sql<Record<string, unknown>>`
    SELECT
      e.retention_entry_id,
      e.period_id,
      e.period_year,
      e.period_month,
      e.source_kind,
      e.source_id,
      e.source_public_ref,
      e.counterparty_name,
      e.source_date::text AS source_date,
      e.currency,
      e.retention_bucket,
      e.retention_rate,
      e.gross_amount,
      e.retention_amount,
      e.retention_amount_clp,
      e.dedup_status
    FROM greenhouse_finance.retention_ledger_entries e
    WHERE e.organization_id = ${params.legalEntityOrganizationId}
      AND e.period_year = ${params.year}
      AND e.period_month = ${params.month}
      AND e.dedup_status = 'counted'
    ORDER BY e.source_date DESC, e.source_public_ref ASC
  `.execute(db)

  return result.rows.map(mapEntryRow)
}
