import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DteCoverageMetrics {
  organizationId: string
  periodYear: number
  periodMonth: number

  // Income metrics
  incomeTotal: number
  incomeWithDte: number
  incomeWithoutDte: number
  incomeCoveragePercent: number
  incomeTotalAmountClp: number
  incomeWithDteAmountClp: number

  // Expense metrics
  expenseTotal: number
  expenseWithDte: number
  expenseWithoutDte: number
  expenseCoveragePercent: number
  expenseTotalAmountClp: number
  expenseWithDteAmountClp: number

  // Discrepancies
  incomeDiscrepancies: DteDiscrepancy[]
  expenseDiscrepancies: DteDiscrepancy[]

  // Orphan DTEs (DTEs without matching finance records)
  orphanDteCount: number

  // Overall coverage
  overallCoveragePercent: number
}

export interface DteDiscrepancy {
  financeId: string
  financeType: 'income' | 'expense'
  financeAmount: number
  dteAmount: number
  discrepancy: number
  dteFolio: string | null
  dteTypeCode: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const safeNumber = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const safePct = (part: number, total: number): number => {
  if (total === 0) return 0

  return Math.round((part / total) * 10000) / 100
}

// ── Core query ───────────────────────────────────────────────────────────────

export async function getDteCoverage(
  organizationId: string,
  periodYear: number,
  periodMonth: number
): Promise<DteCoverageMetrics> {
  // Income coverage
  const incomeRows = await runGreenhousePostgresQuery<{
    total: string
    with_dte: string
    without_dte: string
    total_amount: string
    with_dte_amount: string
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE nubox_document_id IS NOT NULL)::text AS with_dte,
       COUNT(*) FILTER (WHERE nubox_document_id IS NULL)::text AS without_dte,
       COALESCE(SUM(total_amount_clp), 0)::text AS total_amount,
       COALESCE(SUM(total_amount_clp) FILTER (WHERE nubox_document_id IS NOT NULL), 0)::text AS with_dte_amount
     FROM greenhouse_finance.income
     WHERE organization_id = $1
       AND EXTRACT(YEAR FROM invoice_date) = $2
       AND EXTRACT(MONTH FROM invoice_date) = $3`,
    [organizationId, periodYear, periodMonth]
  )

  const incomeTotal = safeNumber(incomeRows[0]?.total)
  const incomeWithDte = safeNumber(incomeRows[0]?.with_dte)
  const incomeWithoutDte = safeNumber(incomeRows[0]?.without_dte)
  const incomeTotalAmountClp = safeNumber(incomeRows[0]?.total_amount)
  const incomeWithDteAmountClp = safeNumber(incomeRows[0]?.with_dte_amount)

  // Expense coverage (join to suppliers to resolve organization)
  const expenseRows = await runGreenhousePostgresQuery<{
    total: string
    with_dte: string
    without_dte: string
    total_amount: string
    with_dte_amount: string
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE e.nubox_purchase_id IS NOT NULL)::text AS with_dte,
       COUNT(*) FILTER (WHERE e.nubox_purchase_id IS NULL)::text AS without_dte,
       COALESCE(SUM(e.total_amount_clp), 0)::text AS total_amount,
       COALESCE(SUM(e.total_amount_clp) FILTER (WHERE e.nubox_purchase_id IS NOT NULL), 0)::text AS with_dte_amount
     FROM greenhouse_finance.expenses e
     LEFT JOIN greenhouse_finance.suppliers s ON s.supplier_id = e.supplier_id
     WHERE s.organization_id = $1
       AND EXTRACT(YEAR FROM e.document_date) = $2
       AND EXTRACT(MONTH FROM e.document_date) = $3`,
    [organizationId, periodYear, periodMonth]
  )

  const expenseTotal = safeNumber(expenseRows[0]?.total)
  const expenseWithDte = safeNumber(expenseRows[0]?.with_dte)
  const expenseWithoutDte = safeNumber(expenseRows[0]?.without_dte)
  const expenseTotalAmountClp = safeNumber(expenseRows[0]?.total_amount)
  const expenseWithDteAmountClp = safeNumber(expenseRows[0]?.with_dte_amount)

  // Income discrepancies from reconciliation proposals
  const incomeDiscrepancyRows = await runGreenhousePostgresQuery<{
    finance_id: string
    finance_amount: string
    dte_amount: string
    discrepancy: string
    dte_folio: string | null
    dte_type_code: string | null
  }>(
    `SELECT
       p.finance_id,
       p.finance_total_amount::text AS finance_amount,
       p.dte_total_amount::text AS dte_amount,
       p.amount_discrepancy::text AS discrepancy,
       p.dte_folio,
       p.dte_type_code
     FROM greenhouse_finance.dte_reconciliation_proposals p
     WHERE p.organization_id = $1
       AND p.finance_type = 'income'
       AND p.status IN ('auto_matched', 'approved')
       AND p.amount_discrepancy IS NOT NULL
       AND ABS(p.amount_discrepancy) > 0
       AND EXTRACT(YEAR FROM p.dte_emission_date) = $2
       AND EXTRACT(MONTH FROM p.dte_emission_date) = $3
     ORDER BY ABS(p.amount_discrepancy) DESC
     LIMIT 50`,
    [organizationId, periodYear, periodMonth]
  )

  const incomeDiscrepancies: DteDiscrepancy[] = incomeDiscrepancyRows.map(r => ({
    financeId: r.finance_id,
    financeType: 'income' as const,
    financeAmount: safeNumber(r.finance_amount),
    dteAmount: safeNumber(r.dte_amount),
    discrepancy: safeNumber(r.discrepancy),
    dteFolio: r.dte_folio,
    dteTypeCode: r.dte_type_code
  }))

  // Expense discrepancies
  const expenseDiscrepancyRows = await runGreenhousePostgresQuery<{
    finance_id: string
    finance_amount: string
    dte_amount: string
    discrepancy: string
    dte_folio: string | null
    dte_type_code: string | null
  }>(
    `SELECT
       p.finance_id,
       p.finance_total_amount::text AS finance_amount,
       p.dte_total_amount::text AS dte_amount,
       p.amount_discrepancy::text AS discrepancy,
       p.dte_folio,
       p.dte_type_code
     FROM greenhouse_finance.dte_reconciliation_proposals p
     WHERE p.organization_id = $1
       AND p.finance_type = 'expense'
       AND p.status IN ('auto_matched', 'approved')
       AND p.amount_discrepancy IS NOT NULL
       AND ABS(p.amount_discrepancy) > 0
       AND EXTRACT(YEAR FROM p.dte_emission_date) = $2
       AND EXTRACT(MONTH FROM p.dte_emission_date) = $3
     ORDER BY ABS(p.amount_discrepancy) DESC
     LIMIT 50`,
    [organizationId, periodYear, periodMonth]
  )

  const expenseDiscrepancies: DteDiscrepancy[] = expenseDiscrepancyRows.map(r => ({
    financeId: r.finance_id,
    financeType: 'expense' as const,
    financeAmount: safeNumber(r.finance_amount),
    dteAmount: safeNumber(r.dte_amount),
    discrepancy: safeNumber(r.discrepancy),
    dteFolio: r.dte_folio,
    dteTypeCode: r.dte_type_code
  }))

  // Orphan DTEs
  const orphanRows = await runGreenhousePostgresQuery<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM greenhouse_finance.dte_reconciliation_proposals
     WHERE organization_id = $1
       AND status = 'orphan'
       AND EXTRACT(YEAR FROM dte_emission_date) = $2
       AND EXTRACT(MONTH FROM dte_emission_date) = $3`,
    [organizationId, periodYear, periodMonth]
  )

  const orphanDteCount = safeNumber(orphanRows[0]?.count)

  // Overall coverage
  const totalRecords = incomeTotal + expenseTotal
  const totalWithDte = incomeWithDte + expenseWithDte
  const overallCoveragePercent = safePct(totalWithDte, totalRecords)

  return {
    organizationId,
    periodYear,
    periodMonth,
    incomeTotal,
    incomeWithDte,
    incomeWithoutDte,
    incomeCoveragePercent: safePct(incomeWithDte, incomeTotal),
    incomeTotalAmountClp,
    incomeWithDteAmountClp,
    expenseTotal,
    expenseWithDte,
    expenseWithoutDte,
    expenseCoveragePercent: safePct(expenseWithDte, expenseTotal),
    expenseTotalAmountClp,
    expenseWithDteAmountClp,
    incomeDiscrepancies,
    expenseDiscrepancies,
    orphanDteCount,
    overallCoveragePercent
  }
}

// ── Summary for Organization Economics ───────────────────────────────────────

export interface DteCoverageSummary {
  organizationId: string
  incomeCoveragePercent: number
  expenseCoveragePercent: number
  overallCoveragePercent: number
  discrepancyCount: number
  orphanDteCount: number
}

/**
 * Lightweight coverage summary suitable for embedding in organization dashboards.
 */
export async function getDteCoverageSummary(
  organizationId: string,
  periodYear: number,
  periodMonth: number
): Promise<DteCoverageSummary> {
  const full = await getDteCoverage(organizationId, periodYear, periodMonth)

  return {
    organizationId,
    incomeCoveragePercent: full.incomeCoveragePercent,
    expenseCoveragePercent: full.expenseCoveragePercent,
    overallCoveragePercent: full.overallCoveragePercent,
    discrepancyCount: full.incomeDiscrepancies.length + full.expenseDiscrepancies.length,
    orphanDteCount: full.orphanDteCount
  }
}
