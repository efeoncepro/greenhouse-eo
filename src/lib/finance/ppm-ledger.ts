import 'server-only'

import { sql } from 'kysely'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { getDb } from '@/lib/db'
import { roundCurrency, toNumber } from '@/lib/finance/shared'

/**
 * TASK-1189 — Posición mensual de PPM (Pago Provisional Mensual, línea PPM del
 * F29) por entidad legal. Mirror del patrón VAT/retenciones (TASK-725/1188).
 *
 * PPM = **base imponible** (ventas netas del período = `income.subtotal`
 * CLP-normalizado, sin anuladas; las notas de crédito DTE 61 entran negativas y
 * netean) × **tasa PPM** (resuelta desde la SSOT `ppm_rate_config`, parametrizable
 * por entidad + rango de período — NUNCA hardcode). Es un agregado (base × tasa),
 * no per-documento, así que no lleva tabla ledger.
 *
 * Scope fiscal = operating entity (`organization_id`), NUNCA `space_id`. Advisory
 * lock por período desde el inicio (lección TASK-1185). La base usa el mismo
 * patrón CLP-normalizado que el VAT materializer (no viola `no-untokenized-fx-math`,
 * que targetea `ip.amount`/`ep.amount` de payments, no `income.subtotal` de invoices).
 */

export interface PpmMonthlyPositionRecord {
  ppmPositionId: string
  periodId: string
  periodYear: number
  periodMonth: number
  organizationId: string | null
  baseAmountClp: number
  ppmRate: number
  ppmAmountClp: number
  rateSource: string | null
  documentCount: number
  materializedAt: string | null
  materializationReason: string | null
}

export interface PpmMaterializationSummary {
  periodId: string
  positionsMaterialized: number
  baseAmountClp: number
  ppmAmountClp: number
}

const padMonth = (month: number) => String(month).padStart(2, '0')

export const buildPpmPeriodId = (year: number, month: number) => `${year}-${padMonth(month)}`

const mapPositionRow = (row: Record<string, unknown>): PpmMonthlyPositionRecord => ({
  ppmPositionId: String(row.ppm_position_id),
  periodId: String(row.period_id),
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  organizationId: row.organization_id == null ? null : String(row.organization_id),
  baseAmountClp: toNumber(row.base_amount_clp),
  ppmRate: toNumber(row.ppm_rate),
  ppmAmountClp: toNumber(row.ppm_amount_clp),
  rateSource: typeof row.rate_source === 'string' ? row.rate_source : null,
  documentCount: Number(row.document_count ?? 0),
  materializedAt: typeof row.materialized_at === 'string' ? row.materialized_at : null,
  materializationReason: typeof row.materialization_reason === 'string' ? row.materialization_reason : null
})

export async function materializePpmForPeriod(
  year: number,
  month: number,
  reason: string
): Promise<PpmMaterializationSummary> {
  const db = await getDb()
  const periodId = buildPpmPeriodId(year, month)

  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    throw new Error(
      'TASK-1189 PPM materialization: no operating entity (is_operating_entity=TRUE) configured. Cannot scope the fiscal position.'
    )
  }

  const legalEntityOrgId = operatingEntity.organizationId

  await db.transaction().execute(async trx => {
    // Advisory lock por período (lección TASK-1185).
    await sql`
      SELECT pg_advisory_xact_lock(hashtext('ppm_materialize'), hashtext(${periodId}::text))
    `.execute(trx)

    await sql`
      DELETE FROM greenhouse_finance.ppm_monthly_positions
      WHERE period_year = ${year}::int AND period_month = ${month}::int
    `.execute(trx)

    await sql`
      WITH base AS (
        SELECT
          COALESCE(SUM(
            CASE
              WHEN i.currency = 'CLP' THEN i.subtotal
              ELSE i.subtotal * COALESCE(NULLIF(i.exchange_rate_to_clp, 0), 1)
            END
          ), 0) AS base_amount_clp,
          COUNT(*) AS document_count
        FROM greenhouse_finance.income i
        WHERE i.period_year = ${year}::int
          AND i.period_month = ${month}::int
          AND COALESCE(i.is_annulled, false) = false
          -- TASK-1185 guard FX: omite income no-CLP con FX nulo/0.
          AND (i.currency = 'CLP' OR COALESCE(NULLIF(i.exchange_rate_to_clp, 0), 0) <> 0)
      ),
      resolved_rate AS (
        SELECT rate, source
        FROM greenhouse_finance.ppm_rate_config
        WHERE (organization_id = ${legalEntityOrgId}::text OR organization_id IS NULL)
          AND effective_period_start <= ${periodId}::text
          AND (effective_period_end IS NULL OR effective_period_end >= ${periodId}::text)
        ORDER BY (organization_id IS NOT NULL) DESC, effective_period_start DESC
        LIMIT 1
      )
      INSERT INTO greenhouse_finance.ppm_monthly_positions (
        ppm_position_id,
        period_year,
        period_month,
        period_id,
        organization_id,
        base_amount_clp,
        ppm_rate,
        ppm_amount_clp,
        rate_source,
        document_count,
        materialized_at,
        materialization_reason,
        metadata
      )
      SELECT
        'EO-PMP-' || upper(substr(md5(concat_ws(':', ${legalEntityOrgId}::text, ${periodId}::text)), 1, 8)),
        ${year}::int,
        ${month}::int,
        ${periodId}::text,
        ${legalEntityOrgId}::text,
        ROUND(base.base_amount_clp, 2),
        COALESCE(rr.rate, 0),
        ROUND(base.base_amount_clp * COALESCE(rr.rate, 0), 2),
        rr.source,
        base.document_count,
        CURRENT_TIMESTAMP,
        ${reason}::text,
        jsonb_build_object('periodId', ${periodId}::text, 'materializationReason', ${reason}::text)
      FROM base
      LEFT JOIN resolved_rate rr ON true
      WHERE base.document_count > 0
    `.execute(trx)
  })

  const summaryResult = await sql<{
    positions_materialized: number
    base_amount_clp: string | number | null
    ppm_amount_clp: string | number | null
  }>`
    SELECT
      COUNT(*)::int AS positions_materialized,
      COALESCE(SUM(p.base_amount_clp), 0) AS base_amount_clp,
      COALESCE(SUM(p.ppm_amount_clp), 0) AS ppm_amount_clp
    FROM greenhouse_finance.ppm_monthly_positions p
    WHERE p.period_year = ${year}::int
      AND p.period_month = ${month}::int
  `.execute(db)

  const summary = summaryResult.rows[0]

  return {
    periodId,
    positionsMaterialized: Number(summary?.positions_materialized ?? 0),
    baseAmountClp: roundCurrency(toNumber(summary?.base_amount_clp)),
    ppmAmountClp: roundCurrency(toNumber(summary?.ppm_amount_clp))
  }
}

export async function materializeAllAvailablePpmPeriods(reason: string) {
  const db = await getDb()

  const periodRows = await sql<{ period_year: number; period_month: number }>`
    SELECT DISTINCT period_year, period_month
    FROM greenhouse_finance.income
    WHERE period_year IS NOT NULL
      AND period_month IS NOT NULL
      AND COALESCE(is_annulled, false) = false
    ORDER BY period_year ASC, period_month ASC
  `.execute(db)

  const summaries: PpmMaterializationSummary[] = []

  for (const period of periodRows.rows) {
    summaries.push(await materializePpmForPeriod(Number(period.period_year), Number(period.period_month), reason))
  }

  return { periods: summaries.length, summaries }
}

export async function getPpmMonthlyPosition(params: {
  legalEntityOrganizationId: string
  year: number
  month: number
}): Promise<PpmMonthlyPositionRecord | null> {
  const db = await getDb()

  const result = await sql<Record<string, unknown>>`
    SELECT
      p.ppm_position_id,
      p.period_id,
      p.period_year,
      p.period_month,
      p.organization_id,
      p.base_amount_clp,
      p.ppm_rate,
      p.ppm_amount_clp,
      p.rate_source,
      p.document_count,
      p.materialized_at::text AS materialized_at,
      p.materialization_reason
    FROM greenhouse_finance.ppm_monthly_positions p
    WHERE p.organization_id = ${params.legalEntityOrganizationId}
      AND p.period_year = ${params.year}
      AND p.period_month = ${params.month}
    LIMIT 1
  `.execute(db)

  return result.rows[0] ? mapPositionRow(result.rows[0]) : null
}

export async function listPpmMonthlyPositions(params: {
  legalEntityOrganizationId: string
  limit?: number
}): Promise<PpmMonthlyPositionRecord[]> {
  const db = await getDb()
  const limit = Math.max(1, Math.min(params.limit ?? 6, 24))

  const result = await sql<Record<string, unknown>>`
    SELECT
      p.ppm_position_id,
      p.period_id,
      p.period_year,
      p.period_month,
      p.organization_id,
      p.base_amount_clp,
      p.ppm_rate,
      p.ppm_amount_clp,
      p.rate_source,
      p.document_count,
      p.materialized_at::text AS materialized_at,
      p.materialization_reason
    FROM greenhouse_finance.ppm_monthly_positions p
    WHERE p.organization_id = ${params.legalEntityOrganizationId}
    ORDER BY p.period_year DESC, p.period_month DESC
    LIMIT ${limit}
  `.execute(db)

  return result.rows.map(mapPositionRow)
}
