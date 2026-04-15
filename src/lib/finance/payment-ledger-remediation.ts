import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { normalizeString, roundCurrency, toNumber } from '@/lib/finance/shared'
import { recordExpensePayment, reconcileExpensePaymentTotals } from '@/lib/finance/expense-payment-ledger'
import { recordPayment, reconcilePaymentTotals } from '@/lib/finance/payment-ledger'

interface CountRow extends Record<string, unknown> {
  count: string
}

interface IdRow extends Record<string, unknown> {
  id: string
}

interface MissingIncomeLedgerRow extends Record<string, unknown> {
  income_id: string
  nubox_document_id: string | null
  invoice_date: string | null
  total_amount: unknown
  amount_paid: unknown
  payment_status: string
}

interface MissingExpenseLedgerRow extends Record<string, unknown> {
  expense_id: string
  payment_date: string | null
  document_date: string | null
  total_amount: unknown
  amount_paid: unknown
  payment_status: string
  payment_method: string | null
  payment_account_id: string | null
  payment_reference: string | null
  source_type: string | null
  payroll_period_id: string | null
  payroll_entry_id: string | null
  nubox_purchase_id: string | null
  nubox_origin: string | null
}

interface DriftIncomeRow extends Record<string, unknown> {
  income_id: string
}

interface DriftExpenseRow extends Record<string, unknown> {
  expense_id: string
}

interface NuboxMovement {
  nubox_movement_id: string
  linked_sale_id: string
  total_amount: string
  payment_date: string
}

export interface LedgerAuditCheck {
  count: number
  sampleIds: string[]
}

export interface FinancePaymentLedgerAudit {
  incomePaidWithoutLedger: LedgerAuditCheck
  incomeLedgerDrift: LedgerAuditCheck
  expensePaidWithoutLedger: LedgerAuditCheck
  expenseLedgerDrift: LedgerAuditCheck
}

export interface IncomeLedgerBackfillResult {
  candidateCount: number
  recoverableCount: number
  incomesBackfilled: number
  paymentRecordsCreated: number
  skippedMissingNuboxDocumentId: number
  skippedNoBankMovements: number
  skippedAmountMismatch: number
  skippedOverpaymentRisk: number
  errors: Array<{ incomeId: string; reason: string }>
}

export interface ExpenseLedgerBackfillResult {
  candidateCount: number
  recoverableCount: number
  expensesBackfilled: number
  paymentRecordsCreated: number
  skippedMissingPaymentDate: number
  skippedOverpaymentRisk: number
  errors: Array<{ expenseId: string; reason: string }>
}

export interface LedgerReconciliationResult {
  incomeDriftCandidates: number
  incomeCorrected: number
  expenseDriftCandidates: number
  expenseCorrected: number
}

export interface FinancePaymentLedgerRemediationResult {
  audit: FinancePaymentLedgerAudit
  incomeBackfill?: IncomeLedgerBackfillResult
  expenseBackfill?: ExpenseLedgerBackfillResult
  reconciliation?: LedgerReconciliationResult
}

export interface FinanceLedgerRemediationOptions {
  dryRun?: boolean
  limit?: number
  includeIncome?: boolean
  includeExpense?: boolean
  reconcileDrift?: boolean
  allowIncomeAmountMismatch?: boolean
}

const DEFAULT_LIMIT = 250
const DEFAULT_SAMPLE_LIMIT = 10

const countFromQuery = async (sql: string, values: unknown[] = []) => {
  const rows = await runGreenhousePostgresQuery<CountRow>(sql, values)

  return Number(rows[0]?.count ?? 0)
}

const idsFromQuery = async (sql: string, values: unknown[] = []) => {
  const rows = await runGreenhousePostgresQuery<IdRow>(sql, values)

  return rows
    .map(row => normalizeString(row.id))
    .filter((id): id is string => Boolean(id))
}

const MISSING_INCOME_LEDGER_FROM = `
  FROM greenhouse_finance.income i
  LEFT JOIN (
    SELECT income_id, COUNT(*)::int AS payment_count
    FROM greenhouse_finance.income_payments
    GROUP BY income_id
  ) ip ON ip.income_id = i.income_id
  WHERE COALESCE(i.is_annulled, FALSE) = FALSE
    AND COALESCE(i.amount_paid, 0) > 0
    AND i.payment_status IN ('paid', 'partial')
    AND COALESCE(ip.payment_count, 0) = 0
`

const BACKFILLABLE_INCOME_LEDGER_FROM = `
  FROM greenhouse_finance.income i
  LEFT JOIN (
    SELECT income_id, COUNT(*)::int AS payment_count
    FROM greenhouse_finance.income_payments
    GROUP BY income_id
  ) ip ON ip.income_id = i.income_id
  WHERE COALESCE(i.is_annulled, FALSE) = FALSE
    AND i.nubox_document_id IS NOT NULL
    AND COALESCE(ip.payment_count, 0) = 0
`

const MISSING_EXPENSE_LEDGER_FROM = `
  FROM greenhouse_finance.expenses e
  LEFT JOIN (
    SELECT expense_id, COUNT(*)::int AS payment_count
    FROM greenhouse_finance.expense_payments
    GROUP BY expense_id
  ) ep ON ep.expense_id = e.expense_id
  WHERE COALESCE(e.is_annulled, FALSE) = FALSE
    AND COALESCE(e.amount_paid, 0) > 0
    AND e.payment_status IN ('paid', 'partial')
    AND COALESCE(ep.payment_count, 0) = 0
`

const INCOME_DRIFT_FROM = `
  FROM greenhouse_finance.income i
  LEFT JOIN (
    SELECT income_id, COALESCE(SUM(amount), 0)::numeric AS total
    FROM greenhouse_finance.income_payments
    GROUP BY income_id
  ) ip ON ip.income_id = i.income_id
  WHERE ABS(COALESCE(i.amount_paid, 0) - COALESCE(ip.total, 0)) > 0.01
`

const EXPENSE_DRIFT_FROM = `
  FROM greenhouse_finance.expenses e
  LEFT JOIN (
    SELECT expense_id, COALESCE(SUM(amount), 0)::numeric AS total
    FROM greenhouse_finance.expense_payments
    GROUP BY expense_id
  ) ep ON ep.expense_id = e.expense_id
  WHERE ABS(COALESCE(e.amount_paid, 0) - COALESCE(ep.total, 0)) > 0.01
`

const deriveExpensePaymentSource = (row: MissingExpenseLedgerRow): 'manual' | 'payroll_system' | 'nubox_sync' | 'bank_statement' => {
  if (normalizeString(row.source_type) === 'bank_statement_detected') {
    return 'bank_statement'
  }

  if (row.payroll_period_id || row.payroll_entry_id || normalizeString(row.source_type) === 'payroll_generated') {
    return 'payroll_system'
  }

  if (row.nubox_purchase_id || row.nubox_origin) {
    return 'nubox_sync'
  }

  return 'manual'
}

const buildIncomeMovementMap = async () => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [movementRows] = await bigQuery.query({
    query: `
      WITH latest_movements AS (
        SELECT * EXCEPT(rn)
        FROM (
          SELECT m.*,
                 ROW_NUMBER() OVER (PARTITION BY nubox_movement_id ORDER BY synced_at DESC, sync_run_id DESC) AS rn
          FROM \`${projectId}.greenhouse_conformed.nubox_bank_movements\` m
        )
        WHERE rn = 1
      )
      SELECT nubox_movement_id, linked_sale_id, total_amount, CAST(payment_date AS STRING) AS payment_date
      FROM latest_movements
      WHERE linked_sale_id IS NOT NULL
        AND movement_direction = 'credit'
        AND payment_date IS NOT NULL
    `
  })

  const movements = movementRows as unknown as NuboxMovement[]
  const movementsBySaleId = new Map<string, NuboxMovement[]>()

  for (const movement of movements) {
    const saleId = normalizeString(movement.linked_sale_id)

    if (!saleId) continue

    const existing = movementsBySaleId.get(saleId) ?? []

    existing.push(movement)
    movementsBySaleId.set(saleId, existing)
  }

  for (const entries of movementsBySaleId.values()) {
    entries.sort((left, right) => {
      const leftKey = `${left.payment_date}|${left.nubox_movement_id}`
      const rightKey = `${right.payment_date}|${right.nubox_movement_id}`

      return leftKey.localeCompare(rightKey)
    })
  }

  return movementsBySaleId
}

export async function auditFinancePaymentLedgers(sampleLimit = DEFAULT_SAMPLE_LIMIT): Promise<FinancePaymentLedgerAudit> {
  const [
    incomePaidWithoutLedgerCount,
    incomePaidWithoutLedgerSample,
    incomeLedgerDriftCount,
    incomeLedgerDriftSample,
    expensePaidWithoutLedgerCount,
    expensePaidWithoutLedgerSample,
    expenseLedgerDriftCount,
    expenseLedgerDriftSample
  ] = await Promise.all([
    countFromQuery(`SELECT COUNT(*)::text AS count ${MISSING_INCOME_LEDGER_FROM}`),
    idsFromQuery(
      `SELECT i.income_id AS id
       ${MISSING_INCOME_LEDGER_FROM}
       ORDER BY i.invoice_date DESC NULLS LAST, i.income_id
       LIMIT $1`,
      [sampleLimit]
    ),
    countFromQuery(`SELECT COUNT(*)::text AS count ${INCOME_DRIFT_FROM}`),
    idsFromQuery(
      `SELECT i.income_id AS id
       ${INCOME_DRIFT_FROM}
       ORDER BY i.invoice_date DESC NULLS LAST, i.income_id
       LIMIT $1`,
      [sampleLimit]
    ),
    countFromQuery(`SELECT COUNT(*)::text AS count ${MISSING_EXPENSE_LEDGER_FROM}`),
    idsFromQuery(
      `SELECT e.expense_id AS id
       ${MISSING_EXPENSE_LEDGER_FROM}
       ORDER BY COALESCE(e.payment_date, e.document_date) DESC NULLS LAST, e.expense_id
       LIMIT $1`,
      [sampleLimit]
    ),
    countFromQuery(`SELECT COUNT(*)::text AS count ${EXPENSE_DRIFT_FROM}`),
    idsFromQuery(
      `SELECT e.expense_id AS id
       ${EXPENSE_DRIFT_FROM}
       ORDER BY COALESCE(e.payment_date, e.document_date) DESC NULLS LAST, e.expense_id
       LIMIT $1`,
      [sampleLimit]
    )
  ])

  return {
    incomePaidWithoutLedger: {
      count: incomePaidWithoutLedgerCount,
      sampleIds: incomePaidWithoutLedgerSample
    },
    incomeLedgerDrift: {
      count: incomeLedgerDriftCount,
      sampleIds: incomeLedgerDriftSample
    },
    expensePaidWithoutLedger: {
      count: expensePaidWithoutLedgerCount,
      sampleIds: expensePaidWithoutLedgerSample
    },
    expenseLedgerDrift: {
      count: expenseLedgerDriftCount,
      sampleIds: expenseLedgerDriftSample
    }
  }
}

export async function backfillIncomePaymentLedgers({
  dryRun = true,
  limit = DEFAULT_LIMIT,
  allowIncomeAmountMismatch = false
}: Pick<FinanceLedgerRemediationOptions, 'dryRun' | 'limit' | 'allowIncomeAmountMismatch'> = {}): Promise<IncomeLedgerBackfillResult> {
  const candidates = await runGreenhousePostgresQuery<MissingIncomeLedgerRow>(
    `SELECT
       i.income_id,
       i.nubox_document_id::text AS nubox_document_id,
       i.invoice_date::text,
       i.total_amount,
       COALESCE(i.amount_paid, 0) AS amount_paid,
       i.payment_status
     ${BACKFILLABLE_INCOME_LEDGER_FROM}
     ORDER BY i.invoice_date DESC NULLS LAST, i.income_id
     LIMIT $1`,
    [limit]
  )

  const movementsBySaleId = candidates.length > 0 ? await buildIncomeMovementMap() : new Map<string, NuboxMovement[]>()

  let recoverableCount = 0
  let incomesBackfilled = 0
  let paymentRecordsCreated = 0
  let skippedMissingNuboxDocumentId = 0
  let skippedNoBankMovements = 0
  let skippedAmountMismatch = 0
  let skippedOverpaymentRisk = 0
  const errors: Array<{ incomeId: string; reason: string }> = []

  for (const candidate of candidates) {
    const incomeId = normalizeString(candidate.income_id)

    if (!incomeId) continue

    const nuboxDocumentId = normalizeString(candidate.nubox_document_id)

    if (!nuboxDocumentId) {
      skippedMissingNuboxDocumentId++
      continue
    }

    const matchedMovements = movementsBySaleId.get(nuboxDocumentId) ?? []

    if (matchedMovements.length === 0) {
      skippedNoBankMovements++
      continue
    }

    const totalAmount = roundCurrency(toNumber(candidate.total_amount))
    const storedAmountPaid = roundCurrency(toNumber(candidate.amount_paid))

    const matchedTotal = roundCurrency(
      matchedMovements.reduce((sum, movement) => sum + toNumber(movement.total_amount), 0)
    )

    if (matchedTotal - totalAmount > 0.01) {
      skippedOverpaymentRisk++
      continue
    }

    if (!allowIncomeAmountMismatch && storedAmountPaid > 0.01 && Math.abs(matchedTotal - storedAmountPaid) > 0.01) {
      skippedAmountMismatch++
      continue
    }

    recoverableCount++

    if (dryRun) {
      continue
    }

    try {
      if (storedAmountPaid > 0.01) {
        await reconcilePaymentTotals(incomeId)
      }

      for (const movement of matchedMovements) {
        await recordPayment({
          incomeId,
          paymentId: `PAY-NUBOX-${movement.nubox_movement_id}`,
          paymentDate: movement.payment_date,
          amount: toNumber(movement.total_amount),
          currency: 'CLP',
          reference: `nubox-mvmt-${movement.nubox_movement_id}`,
          paymentMethod: 'bank_transfer',
          paymentSource: 'nubox_bank_sync',
          notes: 'Backfill canonico desde movimiento bancario Nubox'
        })

        paymentRecordsCreated++
      }

      incomesBackfilled++
    } catch (error) {
      errors.push({
        incomeId,
        reason: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    candidateCount: candidates.length,
    recoverableCount,
    incomesBackfilled,
    paymentRecordsCreated,
    skippedMissingNuboxDocumentId,
    skippedNoBankMovements,
    skippedAmountMismatch,
    skippedOverpaymentRisk,
    errors
  }
}

export async function backfillExpensePaymentLedgers({
  dryRun = true,
  limit = DEFAULT_LIMIT
}: Pick<FinanceLedgerRemediationOptions, 'dryRun' | 'limit'> = {}): Promise<ExpenseLedgerBackfillResult> {
  const candidates = await runGreenhousePostgresQuery<MissingExpenseLedgerRow>(
    `SELECT
       e.expense_id,
       e.payment_date::text,
       e.document_date::text,
       e.total_amount,
       COALESCE(e.amount_paid, 0) AS amount_paid,
       e.payment_status,
       e.payment_method,
       e.payment_account_id,
       e.payment_reference,
       e.source_type,
       e.payroll_period_id,
       e.payroll_entry_id,
       e.nubox_purchase_id::text AS nubox_purchase_id,
       e.nubox_origin
     ${MISSING_EXPENSE_LEDGER_FROM}
     ORDER BY COALESCE(e.payment_date, e.document_date) DESC NULLS LAST, e.expense_id
     LIMIT $1`,
    [limit]
  )

  let recoverableCount = 0
  let expensesBackfilled = 0
  let paymentRecordsCreated = 0
  let skippedMissingPaymentDate = 0
  let skippedOverpaymentRisk = 0
  const errors: Array<{ expenseId: string; reason: string }> = []

  for (const candidate of candidates) {
    const expenseId = normalizeString(candidate.expense_id)

    if (!expenseId) continue

    const paymentDate = normalizeString(candidate.payment_date)

    if (!paymentDate) {
      skippedMissingPaymentDate++
      continue
    }

    const totalAmount = roundCurrency(toNumber(candidate.total_amount))
    const storedAmountPaid = roundCurrency(toNumber(candidate.amount_paid))

    if (storedAmountPaid - totalAmount > 0.01) {
      skippedOverpaymentRisk++
      continue
    }

    recoverableCount++

    if (dryRun) {
      continue
    }

    try {
      await recordExpensePayment({
        expenseId,
        paymentId: `EXP-PAY-BACKFILL-${expenseId}`,
        paymentDate,
        amount: storedAmountPaid,
        reference: normalizeString(candidate.payment_reference) || `legacy-backfill:${expenseId}`,
        paymentMethod: normalizeString(candidate.payment_method),
        paymentAccountId: normalizeString(candidate.payment_account_id),
        paymentSource: deriveExpensePaymentSource(candidate),
        notes: 'Backfill canonico desde estado legacy de pago'
      })

      expensesBackfilled++
      paymentRecordsCreated++
    } catch (error) {
      errors.push({
        expenseId,
        reason: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return {
    candidateCount: candidates.length,
    recoverableCount,
    expensesBackfilled,
    paymentRecordsCreated,
    skippedMissingPaymentDate,
    skippedOverpaymentRisk,
    errors
  }
}

export async function reconcileFinancePaymentLedgerDrift({
  dryRun = true,
  limit = DEFAULT_LIMIT
}: Pick<FinanceLedgerRemediationOptions, 'dryRun' | 'limit'> = {}): Promise<LedgerReconciliationResult> {
  const [incomeCandidates, expenseCandidates] = await Promise.all([
    runGreenhousePostgresQuery<DriftIncomeRow>(
      `SELECT i.income_id
       ${INCOME_DRIFT_FROM}
       ORDER BY i.invoice_date DESC NULLS LAST, i.income_id
       LIMIT $1`,
      [limit]
    ),
    runGreenhousePostgresQuery<DriftExpenseRow>(
      `SELECT e.expense_id
       ${EXPENSE_DRIFT_FROM}
       ORDER BY COALESCE(e.payment_date, e.document_date) DESC NULLS LAST, e.expense_id
       LIMIT $1`,
      [limit]
    )
  ])

  let incomeCorrected = 0
  let expenseCorrected = 0

  if (!dryRun) {
    for (const candidate of incomeCandidates) {
      const result = await reconcilePaymentTotals(candidate.income_id)

      if (result.corrected) {
        incomeCorrected++
      }
    }

    for (const candidate of expenseCandidates) {
      const result = await reconcileExpensePaymentTotals(candidate.expense_id)

      if (result.corrected) {
        expenseCorrected++
      }
    }
  }

  return {
    incomeDriftCandidates: incomeCandidates.length,
    incomeCorrected,
    expenseDriftCandidates: expenseCandidates.length,
    expenseCorrected
  }
}

export async function runFinancePaymentLedgerRemediation({
  dryRun = true,
  limit = DEFAULT_LIMIT,
  includeIncome = true,
  includeExpense = true,
  reconcileDrift = true,
  allowIncomeAmountMismatch = false
}: FinanceLedgerRemediationOptions = {}): Promise<FinancePaymentLedgerRemediationResult> {
  const audit = await auditFinancePaymentLedgers()

  const result: FinancePaymentLedgerRemediationResult = { audit }

  if (includeIncome) {
    result.incomeBackfill = await backfillIncomePaymentLedgers({
      dryRun,
      limit,
      allowIncomeAmountMismatch
    })
  }

  if (includeExpense) {
    result.expenseBackfill = await backfillExpensePaymentLedgers({
      dryRun,
      limit
    })
  }

  if (reconcileDrift) {
    result.reconciliation = await reconcileFinancePaymentLedgerDrift({
      dryRun,
      limit
    })
  }

  return result
}
