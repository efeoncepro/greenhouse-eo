import 'server-only'

import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

import type {
  ExpenseDistributionExpenseInput,
  ExpenseDistributionResolutionDraft
} from './types'

type ExpenseDistributionExpenseRow = {
  expense_id: string
  period_year: number | null
  period_month: number | null
  payment_date: string | null
  document_date: string | null
  receipt_date: string | null
  total_amount_clp: string | number | null
  effective_cost_amount_clp: string | number | null
  economic_category: string | null
  cost_category: string | null
  cost_is_direct: boolean | null
  expense_type: string | null
  supplier_id: string | null
  supplier_name: string | null
  description: string | null
  payment_provider: string | null
  payment_rail: string | null
  member_id: string | null
  payroll_entry_id: string | null
  payroll_period_id: string | null
  client_id: string | null
  allocated_client_id: string | null
  tool_catalog_id: string | null
  direct_overhead_scope: string | null
  direct_overhead_kind: string | null
  direct_overhead_member_id: string | null
}

type ActiveResolutionRow = {
  resolution_id: string
  distribution_lane: string
  resolution_status: string
  amount_clp: string | number
  member_id: string | null
  client_id: string | null
  supplier_id: string | null
  tool_catalog_id: string | null
  payroll_entry_id: string | null
  payroll_period_id: string | null
  payment_obligation_id: string | null
}

export interface ExpenseDistributionPeriod {
  year: number
  month: number
}

export interface PersistExpenseDistributionResult {
  resolutionId: string
  action: 'inserted' | 'unchanged' | 'superseded_and_inserted'
}

const buildResolutionId = (expenseId: string) =>
  `edr-${expenseId.slice(0, 36).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()}-${randomUUID().slice(0, 8)}`

const toExpenseInput = (row: ExpenseDistributionExpenseRow): ExpenseDistributionExpenseInput => ({
  expenseId: row.expense_id,
  periodYear: row.period_year,
  periodMonth: row.period_month,
  paymentDate: row.payment_date,
  documentDate: row.document_date,
  receiptDate: row.receipt_date,
  totalAmountClp: row.total_amount_clp,
  effectiveCostAmountClp: row.effective_cost_amount_clp,
  economicCategory: row.economic_category,
  costCategory: row.cost_category,
  costIsDirect: row.cost_is_direct,
  expenseType: row.expense_type,
  supplierId: row.supplier_id,
  supplierName: row.supplier_name,
  description: row.description,
  paymentProvider: row.payment_provider,
  paymentRail: row.payment_rail,
  memberId: row.member_id,
  payrollEntryId: row.payroll_entry_id,
  payrollPeriodId: row.payroll_period_id,
  clientId: row.client_id,
  allocatedClientId: row.allocated_client_id,
  toolCatalogId: row.tool_catalog_id,
  directOverheadScope: row.direct_overhead_scope,
  directOverheadKind: row.direct_overhead_kind,
  directOverheadMemberId: row.direct_overhead_member_id
})

const amountEquals = (left: string | number | null, right: number) =>
  Math.abs(Number(left ?? 0) - right) < 0.005

const activeResolutionMatches = (
  current: ActiveResolutionRow,
  draft: ExpenseDistributionResolutionDraft
) =>
  current.distribution_lane === draft.distributionLane &&
  current.resolution_status === draft.resolutionStatus &&
  amountEquals(current.amount_clp, draft.amountClp) &&
  (current.member_id ?? null) === draft.memberId &&
  (current.client_id ?? null) === draft.clientId &&
  (current.supplier_id ?? null) === draft.supplierId &&
  (current.tool_catalog_id ?? null) === draft.toolCatalogId &&
  (current.payroll_entry_id ?? null) === draft.payrollEntryId &&
  (current.payroll_period_id ?? null) === draft.payrollPeriodId &&
  (current.payment_obligation_id ?? null) === draft.paymentObligationId

export const listExpensesForDistributionPeriod = async (
  period: ExpenseDistributionPeriod
): Promise<ExpenseDistributionExpenseInput[]> => {
  const rows = await query<ExpenseDistributionExpenseRow>(
    `
      SELECT
        expense_id,
        period_year,
        period_month,
        payment_date::text,
        document_date::text,
        receipt_date::text,
        total_amount_clp,
        effective_cost_amount_clp,
        economic_category,
        cost_category,
        cost_is_direct,
        expense_type,
        supplier_id,
        supplier_name,
        description,
        payment_provider,
        payment_rail,
        member_id,
        payroll_entry_id,
        payroll_period_id,
        client_id,
        allocated_client_id,
        tool_catalog_id,
        direct_overhead_scope,
        direct_overhead_kind,
        direct_overhead_member_id
      FROM greenhouse_finance.expenses
      WHERE COALESCE(period_year, EXTRACT(YEAR FROM COALESCE(payment_date, document_date, receipt_date))::int) = $1
        AND COALESCE(period_month, EXTRACT(MONTH FROM COALESCE(payment_date, document_date, receipt_date))::int) = $2
        AND COALESCE(is_annulled, FALSE) = FALSE
    `,
    [period.year, period.month]
  )

  return rows.map(toExpenseInput)
}

const findActiveResolution = async (
  client: PoolClient,
  draft: ExpenseDistributionResolutionDraft
) => {
  const result = await client.query<ActiveResolutionRow>(
    `
      SELECT
        resolution_id,
        distribution_lane,
        resolution_status,
        amount_clp,
        member_id,
        client_id,
        supplier_id,
        tool_catalog_id,
        payroll_entry_id,
        payroll_period_id,
        payment_obligation_id
      FROM greenhouse_finance.expense_distribution_resolution
      WHERE expense_id = $1
        AND period_year = $2
        AND period_month = $3
        AND superseded_at IS NULL
      LIMIT 1
    `,
    [draft.expenseId, draft.periodYear, draft.periodMonth]
  )

  return result.rows[0] ?? null
}

const insertResolution = async (
  client: PoolClient,
  draft: ExpenseDistributionResolutionDraft
) => {
  const resolutionId = buildResolutionId(draft.expenseId)

  await client.query(
    `
      INSERT INTO greenhouse_finance.expense_distribution_resolution (
        resolution_id,
        expense_id,
        period_year,
        period_month,
        distribution_lane,
        resolution_status,
        confidence,
        source,
        amount_clp,
        basis_amount_clp,
        economic_category,
        legacy_cost_category,
        member_id,
        client_id,
        supplier_id,
        tool_catalog_id,
        payroll_entry_id,
        payroll_period_id,
        payment_obligation_id,
        evidence_json,
        risk_flags
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20::jsonb, $21::text[]
      )
    `,
    [
      resolutionId,
      draft.expenseId,
      draft.periodYear,
      draft.periodMonth,
      draft.distributionLane,
      draft.resolutionStatus,
      draft.confidence,
      draft.source,
      draft.amountClp,
      draft.basisAmountClp,
      draft.economicCategory,
      draft.legacyCostCategory,
      draft.memberId,
      draft.clientId,
      draft.supplierId,
      draft.toolCatalogId,
      draft.payrollEntryId,
      draft.payrollPeriodId,
      draft.paymentObligationId,
      JSON.stringify(draft.evidence),
      draft.riskFlags
    ]
  )

  return resolutionId
}

export const persistExpenseDistributionResolution = async (
  draft: ExpenseDistributionResolutionDraft
): Promise<PersistExpenseDistributionResult> => {
  if (draft.periodYear <= 0 || draft.periodMonth <= 0) {
    throw new Error(`Cannot persist distribution without valid period for expense ${draft.expenseId}`)
  }

  return withTransaction(async client => {
    const current = await findActiveResolution(client, draft)

    if (current && activeResolutionMatches(current, draft)) {
      return {
        resolutionId: current.resolution_id,
        action: 'unchanged'
      }
    }

    if (current) {
      await client.query(
        `
          UPDATE greenhouse_finance.expense_distribution_resolution
             SET resolution_status = 'superseded',
                 superseded_at = NOW()
           WHERE resolution_id = $1
        `,
        [current.resolution_id]
      )
    }

    const resolutionId = await insertResolution(client, draft)

    return {
      resolutionId,
      action: current ? 'superseded_and_inserted' : 'inserted'
    }
  })
}

export const readSharedOperationalOverheadPool = async (
  period: ExpenseDistributionPeriod
): Promise<number> => {
  const rows = await query<{ total_clp: string | number | null }>(
    `
      SELECT COALESCE(SUM(amount_clp), 0) AS total_clp
      FROM greenhouse_finance.expense_distribution_resolution
      WHERE period_year = $1
        AND period_month = $2
        AND distribution_lane = 'shared_operational_overhead'
        AND resolution_status = 'resolved'
        AND superseded_at IS NULL
    `,
    [period.year, period.month]
  )

  return Number(rows[0]?.total_clp ?? 0)
}
