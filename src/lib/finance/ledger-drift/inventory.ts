import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-929 — Finance ledger drift inventory (read-only).
 *
 * The control surface for operators/finance to SEE what drift exists today,
 * classified by accounting type and routed by materiality. Pure read — never
 * mutates. Complements the reliability signal `finance.ledger.unresolved_drift_items`
 * (which gives the dashboard count) by exposing the per-item breakdown.
 *
 * Materiality governs ROUTING, not detection (TASK-929 OQ1):
 *   - Settlement drift: every row from `income_settlement_reconciliation`
 *     WHERE has_drift (the VIEW tolerance 0.01 is the detection floor). Any
 *     settlement drift is a balance-integrity issue → always surfaced.
 *   - Unanchored paid expenses: bucketed by amount against the human-review
 *     threshold. Material (>= threshold) → human review; immaterial → batch-accept
 *     candidate (they already carry economic_category, so P&L is not polluted).
 *
 * The internal-transfer imbalance (task714d) is surfaced as an OUT-OF-SCOPE
 * flag: it blocks 4Q closure but its fix lives in TASK-714d
 * (`createInternalTransferSettlement`), not here.
 */

// TASK-929 OQ1 conservative default. Final value calibrated with finance sign-off.
// Override via env without code change.
export const UNANCHORED_MATERIALITY_THRESHOLD_CLP = (() => {
  const raw = process.env.LEDGER_DRIFT_UNANCHORED_MATERIALITY_CLP
  const parsed = raw ? Number(raw) : 50_000

  
return Number.isFinite(parsed) && parsed >= 0 ? parsed : 50_000
})()

export type SettlementDriftItem = {
  incomeId: string
  totalAmount: number
  amountPaid: number
  expectedSettlement: number
  drift: number
}

export type UnanchoredExpenseItem = {
  expenseId: string
  expenseType: string
  economicCategory: string | null
  totalAmount: number
  paymentDate: string | null
}

export type InternalTransferImbalanceItem = {
  settlementGroupId: string
  outCount: number
  inCount: number
}

export interface LedgerDriftInventory {
  generatedAt: string
  materialityThresholdClp: number
  settlement: {
    count: number
    items: SettlementDriftItem[]
  }
  unanchored: {
    totalClp: number
    materialCount: number
    immaterialCount: number
    material: UnanchoredExpenseItem[]
    immaterial: UnanchoredExpenseItem[]
  }
  /** OUT OF SCOPE — flagged as a 4Q closure blocker owned by TASK-714d. */
  internalTransferImbalance: {
    count: number
    items: InternalTransferImbalanceItem[]
    note: string
  }
}

/**
 * Pure routing: split unanchored expenses into material (>= threshold, human
 * review) vs immaterial (< threshold, batch-accept candidate). Exported for
 * unit testing without a DB.
 */
export const bucketUnanchoredByMateriality = (
  items: UnanchoredExpenseItem[],
  thresholdClp: number
): { material: UnanchoredExpenseItem[]; immaterial: UnanchoredExpenseItem[] } => {
  const material: UnanchoredExpenseItem[] = []
  const immaterial: UnanchoredExpenseItem[] = []

  for (const item of items) {
    if (Math.abs(item.totalAmount) >= thresholdClp) {
      material.push(item)
    } else {
      immaterial.push(item)
    }
  }

  return { material, immaterial }
}

const SETTLEMENT_SQL = `
  SELECT income_id, total_amount::text, amount_paid::text, expected_settlement::text, drift::text
  FROM greenhouse_finance.income_settlement_reconciliation
  WHERE has_drift = TRUE
  ORDER BY ABS(drift) DESC
`

const UNANCHORED_SQL = `
  SELECT e.expense_id, e.expense_type, e.economic_category, e.total_amount::text, e.payment_date::text
  FROM greenhouse_finance.expenses e
  WHERE e.payment_status = 'paid'
    AND e.payroll_entry_id IS NULL
    AND e.tool_catalog_id IS NULL
    AND e.supplier_id IS NULL
    AND e.tax_type IS NULL
    AND e.loan_account_id IS NULL
    AND e.linked_income_id IS NULL
  ORDER BY e.total_amount DESC
`

const ITX_IMBALANCE_SQL = `
  SELECT settlement_group_id,
         SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)::int AS out_count,
         SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)::int AS in_count
  FROM greenhouse_finance.settlement_legs
  WHERE leg_type = 'internal_transfer'
    AND superseded_at IS NULL
    AND superseded_by_otb_id IS NULL
  GROUP BY settlement_group_id
  HAVING SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END)
      <> SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END)
  ORDER BY settlement_group_id
`

export const getLedgerDriftInventory = async (): Promise<LedgerDriftInventory> => {
  const [settlementRows, unanchoredRows, itxRows] = await Promise.all([
    runGreenhousePostgresQuery<{
      income_id: string
      total_amount: string
      amount_paid: string
      expected_settlement: string
      drift: string
    }>(SETTLEMENT_SQL),
    runGreenhousePostgresQuery<{
      expense_id: string
      expense_type: string
      economic_category: string | null
      total_amount: string
      payment_date: string | null
    }>(UNANCHORED_SQL),
    runGreenhousePostgresQuery<{ settlement_group_id: string; out_count: number; in_count: number }>(
      ITX_IMBALANCE_SQL
    )
  ])

  const settlement = settlementRows.map(row => ({
    incomeId: row.income_id,
    totalAmount: Number(row.total_amount),
    amountPaid: Number(row.amount_paid),
    expectedSettlement: Number(row.expected_settlement),
    drift: Number(row.drift)
  }))

  const unanchoredItems: UnanchoredExpenseItem[] = unanchoredRows.map(row => ({
    expenseId: row.expense_id,
    expenseType: row.expense_type,
    economicCategory: row.economic_category,
    totalAmount: Number(row.total_amount),
    paymentDate: row.payment_date
  }))

  const { material, immaterial } = bucketUnanchoredByMateriality(
    unanchoredItems,
    UNANCHORED_MATERIALITY_THRESHOLD_CLP
  )

  const internalTransferItems = itxRows.map(row => ({
    settlementGroupId: row.settlement_group_id,
    outCount: Number(row.out_count),
    inCount: Number(row.in_count)
  }))

  return {
    generatedAt: new Date().toISOString(),
    materialityThresholdClp: UNANCHORED_MATERIALITY_THRESHOLD_CLP,
    settlement: {
      count: settlement.length,
      items: settlement
    },
    unanchored: {
      totalClp: unanchoredItems.reduce((sum, item) => sum + item.totalAmount, 0),
      materialCount: material.length,
      immaterialCount: immaterial.length,
      material,
      immaterial
    },
    internalTransferImbalance: {
      count: internalTransferItems.length,
      items: internalTransferItems,
      note: 'OUT OF SCOPE de TASK-929 — fix canónico vía TASK-714d (createInternalTransferSettlement). Bloquea cierre de JAVASCRIPT-NEXTJS-4Q mientras count > 0.'
    }
  }
}
