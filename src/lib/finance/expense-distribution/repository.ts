import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

import type {
  ExpenseDistributionExpenseInput,
  ExpenseDistributionLane,
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

type ReviewQueueRow = ExpenseDistributionExpenseRow & {
  resolution_id: string
  distribution_lane: string
  resolution_status: string
  confidence: string
  amount_clp: string | number
  evidence_json: unknown
  risk_flags: string[] | null
}

type AiSuggestionRow = {
  suggestion_id: string
  expense_id: string
  period_year: number | string
  period_month: number | string
  suggested_distribution_lane: ExpenseDistributionLane
  suggested_member_id: string | null
  suggested_client_id: string | null
  confidence: string
  rationale: string
  evidence_json: unknown
  input_hash: string
  prompt_hash: string
  model_id: string
  status: string
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  applied_resolution_id: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseDistributionPeriod {
  year: number
  month: number
}

export interface PersistExpenseDistributionResult {
  resolutionId: string
  action: 'inserted' | 'unchanged' | 'superseded_and_inserted'
}

export interface ExpenseDistributionReviewQueueItem {
  resolutionId: string
  expense: ExpenseDistributionExpenseInput
  distributionLane: string
  resolutionStatus: string
  confidence: string
  amountClp: number
  evidence: Record<string, unknown>
  riskFlags: string[]
}

export interface ExpenseDistributionAiSuggestion {
  suggestionId: string
  expenseId: string
  periodYear: number
  periodMonth: number
  suggestedDistributionLane: ExpenseDistributionLane
  suggestedMemberId: string | null
  suggestedClientId: string | null
  confidence: string
  rationale: string
  evidence: Record<string, unknown>
  inputHash: string
  promptHash: string
  modelId: string
  status: string
  reviewedByUserId: string | null
  reviewedAt: string | null
  appliedResolutionId: string | null
  createdAt: string
  updatedAt: string
}

export interface PersistExpenseDistributionAiSuggestionInput {
  suggestionId: string
  expenseId: string
  periodYear: number
  periodMonth: number
  suggestedDistributionLane: ExpenseDistributionLane
  suggestedMemberId: string | null
  suggestedClientId: string | null
  confidence: string
  rationale: string
  evidence: Record<string, unknown>
  inputHash: string
  promptHash: string
  modelId: string
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const mapReviewQueueRow = (row: ReviewQueueRow): ExpenseDistributionReviewQueueItem => ({
  resolutionId: row.resolution_id,
  expense: toExpenseInput(row),
  distributionLane: row.distribution_lane,
  resolutionStatus: row.resolution_status,
  confidence: row.confidence,
  amountClp: Number(row.amount_clp ?? 0),
  evidence: asRecord(row.evidence_json),
  riskFlags: row.risk_flags ?? []
})

const mapAiSuggestionRow = (row: AiSuggestionRow): ExpenseDistributionAiSuggestion => ({
  suggestionId: row.suggestion_id,
  expenseId: row.expense_id,
  periodYear: Number(row.period_year),
  periodMonth: Number(row.period_month),
  suggestedDistributionLane: row.suggested_distribution_lane,
  suggestedMemberId: row.suggested_member_id,
  suggestedClientId: row.suggested_client_id,
  confidence: row.confidence,
  rationale: row.rationale,
  evidence: asRecord(row.evidence_json),
  inputHash: row.input_hash,
  promptHash: row.prompt_hash,
  modelId: row.model_id,
  status: row.status,
  reviewedByUserId: row.reviewed_by_user_id,
  reviewedAt: row.reviewed_at,
  appliedResolutionId: row.applied_resolution_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
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

export const getExpenseForDistribution = async (
  expenseId: string
): Promise<ExpenseDistributionExpenseInput | null> => {
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
      WHERE expense_id = $1
        AND COALESCE(is_annulled, FALSE) = FALSE
      LIMIT 1
    `,
    [expenseId]
  )

  return rows[0] ? toExpenseInput(rows[0]) : null
}

export const listExpenseDistributionReviewQueue = async ({
  period,
  limit = 50
}: {
  period?: ExpenseDistributionPeriod
  limit?: number
} = {}): Promise<ExpenseDistributionReviewQueueItem[]> => {
  const cappedLimit = Math.min(Math.max(limit, 1), 200)
  const values: unknown[] = []

  const periodFilter = period
    ? 'AND edr.period_year = $1 AND edr.period_month = $2'
    : ''

  if (period) {
    values.push(period.year, period.month)
  }

  values.push(cappedLimit)

  const rows = await query<ReviewQueueRow>(
    `
      SELECT
        edr.resolution_id,
        edr.distribution_lane,
        edr.resolution_status,
        edr.confidence,
        edr.amount_clp,
        edr.evidence_json,
        edr.risk_flags,
        e.expense_id,
        e.period_year,
        e.period_month,
        e.payment_date::text,
        e.document_date::text,
        e.receipt_date::text,
        e.total_amount_clp,
        e.effective_cost_amount_clp,
        e.economic_category,
        e.cost_category,
        e.cost_is_direct,
        e.expense_type,
        e.supplier_id,
        e.supplier_name,
        e.description,
        e.payment_provider,
        e.payment_rail,
        e.member_id,
        e.payroll_entry_id,
        e.payroll_period_id,
        e.client_id,
        e.allocated_client_id,
        e.tool_catalog_id,
        e.direct_overhead_scope,
        e.direct_overhead_kind,
        e.direct_overhead_member_id
      FROM greenhouse_finance.expense_distribution_resolution edr
      JOIN greenhouse_finance.expenses e ON e.expense_id = edr.expense_id
      WHERE edr.superseded_at IS NULL
        AND (
          edr.resolution_status IN ('manual_required', 'blocked')
          OR edr.distribution_lane = 'unallocated'
          OR edr.confidence IN ('low', 'manual_required')
        )
        ${periodFilter}
      ORDER BY edr.period_year DESC, edr.period_month DESC, edr.resolved_at DESC
      LIMIT $${values.length}
    `,
    values
  )

  return rows.map(mapReviewQueueRow)
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

export const persistExpenseDistributionAiSuggestion = async (
  input: PersistExpenseDistributionAiSuggestionInput
): Promise<ExpenseDistributionAiSuggestion> => {
  const rows = await query<AiSuggestionRow>(
    `
      INSERT INTO greenhouse_finance.expense_distribution_ai_suggestions (
        suggestion_id,
        expense_id,
        period_year,
        period_month,
        suggested_distribution_lane,
        suggested_member_id,
        suggested_client_id,
        confidence,
        rationale,
        evidence_json,
        input_hash,
        prompt_hash,
        model_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10::jsonb, $11, $12, $13
      )
      ON CONFLICT (expense_id, input_hash, prompt_hash, model_id)
      DO UPDATE SET
        suggested_distribution_lane = EXCLUDED.suggested_distribution_lane,
        suggested_member_id = EXCLUDED.suggested_member_id,
        suggested_client_id = EXCLUDED.suggested_client_id,
        confidence = EXCLUDED.confidence,
        rationale = EXCLUDED.rationale,
        evidence_json = EXCLUDED.evidence_json,
        status = CASE
          WHEN greenhouse_finance.expense_distribution_ai_suggestions.status = 'pending_review'
            THEN 'pending_review'
          ELSE greenhouse_finance.expense_distribution_ai_suggestions.status
        END
      RETURNING
        suggestion_id,
        expense_id,
        period_year,
        period_month,
        suggested_distribution_lane,
        suggested_member_id,
        suggested_client_id,
        confidence,
        rationale,
        evidence_json,
        input_hash,
        prompt_hash,
        model_id,
        status,
        reviewed_by_user_id,
        reviewed_at::text,
        applied_resolution_id,
        created_at::text,
        updated_at::text
    `,
    [
      input.suggestionId,
      input.expenseId,
      input.periodYear,
      input.periodMonth,
      input.suggestedDistributionLane,
      input.suggestedMemberId,
      input.suggestedClientId,
      input.confidence,
      input.rationale,
      JSON.stringify(input.evidence),
      input.inputHash,
      input.promptHash,
      input.modelId
    ]
  )

  return mapAiSuggestionRow(rows[0])
}

export const listExpenseDistributionAiSuggestions = async ({
  period,
  status = 'pending_review',
  limit = 50
}: {
  period?: ExpenseDistributionPeriod
  status?: string
  limit?: number
} = {}): Promise<ExpenseDistributionAiSuggestion[]> => {
  const cappedLimit = Math.min(Math.max(limit, 1), 200)
  const values: unknown[] = [status]

  const periodFilter = period
    ? 'AND period_year = $2 AND period_month = $3'
    : ''

  if (period) {
    values.push(period.year, period.month)
  }

  values.push(cappedLimit)

  const rows = await query<AiSuggestionRow>(
    `
      SELECT
        suggestion_id,
        expense_id,
        period_year,
        period_month,
        suggested_distribution_lane,
        suggested_member_id,
        suggested_client_id,
        confidence,
        rationale,
        evidence_json,
        input_hash,
        prompt_hash,
        model_id,
        status,
        reviewed_by_user_id,
        reviewed_at::text,
        applied_resolution_id,
        created_at::text,
        updated_at::text
      FROM greenhouse_finance.expense_distribution_ai_suggestions
      WHERE status = $1
        ${periodFilter}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values
  )

  return rows.map(mapAiSuggestionRow)
}

export const getExpenseDistributionAiSuggestion = async (
  suggestionId: string
): Promise<ExpenseDistributionAiSuggestion | null> => {
  const rows = await query<AiSuggestionRow>(
    `
      SELECT
        suggestion_id,
        expense_id,
        period_year,
        period_month,
        suggested_distribution_lane,
        suggested_member_id,
        suggested_client_id,
        confidence,
        rationale,
        evidence_json,
        input_hash,
        prompt_hash,
        model_id,
        status,
        reviewed_by_user_id,
        reviewed_at::text,
        applied_resolution_id,
        created_at::text,
        updated_at::text
      FROM greenhouse_finance.expense_distribution_ai_suggestions
      WHERE suggestion_id = $1
      LIMIT 1
    `,
    [suggestionId]
  )

  return rows[0] ? mapAiSuggestionRow(rows[0]) : null
}


export const reviewExpenseDistributionAiSuggestion = async ({
  suggestionId,
  decision,
  actorUserId,
  appliedResolutionId = null
}: {
  suggestionId: string
  decision: 'approved' | 'rejected'
  actorUserId: string
  appliedResolutionId?: string | null
}): Promise<ExpenseDistributionAiSuggestion> => {
  const rows = await query<AiSuggestionRow>(
    `
      UPDATE greenhouse_finance.expense_distribution_ai_suggestions
      SET
        status = $2,
        reviewed_by_user_id = $3,
        reviewed_at = NOW(),
        applied_resolution_id = $4
      WHERE suggestion_id = $1
        AND status = 'pending_review'
      RETURNING
        suggestion_id,
        expense_id,
        period_year,
        period_month,
        suggested_distribution_lane,
        suggested_member_id,
        suggested_client_id,
        confidence,
        rationale,
        evidence_json,
        input_hash,
        prompt_hash,
        model_id,
        status,
        reviewed_by_user_id,
        reviewed_at::text,
        applied_resolution_id,
        created_at::text,
        updated_at::text
    `,
    [suggestionId, decision, actorUserId, appliedResolutionId]
  )

  if (!rows[0]) {
    throw new Error('Expense distribution AI suggestion not found or already reviewed')
  }

  return mapAiSuggestionRow(rows[0])
}
