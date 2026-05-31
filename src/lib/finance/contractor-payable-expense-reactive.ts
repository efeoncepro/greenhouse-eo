import 'server-only'

import {
  buildMonthlySequenceIdFromPostgres,
  createFinanceExpenseInPostgres
} from '@/lib/finance/postgres-store-slice2'
import { buildExpenseTaxWriteFields, serializeExpenseTaxSnapshot } from '@/lib/finance/expense-tax-snapshot'
import { resolveExchangeRateToClp } from '@/lib/finance/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ContractorPayable } from '@/lib/contractor-engagements/payables/types'

/**
 * TASK-977 Slice 2 — Materialize a contractor payable's expense.
 *
 * Mirror of `materializePayrollExpensesForExportedPeriod` (payroll-expense-reactive.ts):
 * payroll materializes its expense when the period reaches `exported`; the contractor
 * materializes its expense when the payable reaches `ready_for_finance`. The settlement
 * (TASK-977 Slice 3) then resolves THIS expense by `contractor_payable_id` and records the
 * net payment + settlement_leg (bank debit).
 *
 * Accounting (canonical invariant — CLAUDE.md TASK-795 "gasto = bruto, retención = pasivo"):
 *   - expense.total_amount = GROSS (the recognized cost of the service)
 *   - economic_category = 'labor_cost_external' (pinned via resolver Rule 0, source-driven)
 *   - the SII withholding (gross − net) is a SEPARATE liability to remit (F29) — out of scope.
 *     Consequence: for honorarios CL the expense stays `partial` (net of gross) until the SII
 *     remittance flow exists; for withholding=0 lanes it settles to `paid`.
 *
 * Idempotent: dedup by `contractor_payable_id` (one expense per payable).
 */

type BeneficiaryNameRow = { display_name: string | null }
type ExistingExpenseRow = { expense_id: string }

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const pad2 = (value: number) => String(value).padStart(2, '0')

/**
 * The payable is "committed to Finance" in any of these states. The expense must
 * exist from `ready_for_finance` onwards. We do NOT gate strictly on
 * `ready_for_finance` because the obligation bridge (same trigger event) may have
 * already advanced the payable to `obligation_created` before this projection runs.
 */
const COMMITTED_STATES: ReadonlySet<ContractorPayable['status']> = new Set([
  'ready_for_finance',
  'obligation_created',
  'payment_order_created',
  'paid'
])

const resolveBeneficiaryName = async (payable: ContractorPayable): Promise<string> => {
  if (payable.beneficiaryType === 'member') {
    const rows = await runGreenhousePostgresQuery<BeneficiaryNameRow>(
      `SELECT display_name FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
      [payable.beneficiaryId]
    ).catch(() => [])

    return rows[0]?.display_name || payable.beneficiaryId
  }

  const rows = await runGreenhousePostgresQuery<BeneficiaryNameRow>(
    `SELECT display_name FROM greenhouse_core.identity_profiles WHERE identity_profile_id = $1 LIMIT 1`,
    [payable.beneficiaryId]
  ).catch(() => [])

  return rows[0]?.display_name || payable.beneficiaryId
}

export interface MaterializeContractorPayableExpenseResult {
  created: boolean
  expenseId: string | null
  reason: string
}

/**
 * Idempotently materialize the expense for a contractor payable. Returns
 * `created=false` when the payable is not committed, cancelled, or the expense
 * already exists.
 */
export const materializeContractorPayableExpense = async (
  payable: ContractorPayable
): Promise<MaterializeContractorPayableExpenseResult> => {
  if (!COMMITTED_STATES.has(payable.status)) {
    return { created: false, expenseId: null, reason: `status=${payable.status} not committed; skipped` }
  }

  // Dedup by the canonical anchor (one expense per payable).
  const existing = await runGreenhousePostgresQuery<ExistingExpenseRow>(
    `SELECT expense_id FROM greenhouse_finance.expenses WHERE contractor_payable_id = $1 LIMIT 1`,
    [payable.contractorPayableId]
  )

  if (existing.length > 0) {
    return { created: false, expenseId: existing[0].expense_id, reason: 'already materialized; skipped' }
  }

  // Accounting: expense recognizes the GROSS (the withholding is a separate liability).
  const gross = toNumber(payable.grossAmount)
  const currency = payable.currency === 'USD' ? 'USD' : 'CLP'

  const exchangeRateToClp = await resolveExchangeRateToClp({ currency, requestedRate: null })

  // Honorarios / contractor service: no recoverable IVA (boleta de honorarios / external
  // service), mirror of payroll's non-billable VAT treatment.
  const taxWriteFields = await buildExpenseTaxWriteFields({
    subtotal: gross,
    exchangeRateToClp,
    taxCode: 'cl_vat_non_billable',
    taxAmount: 0,
    totalAmount: gross,
    issuedAt: payable.dueDate ?? undefined
  })

  const now = new Date()
  const sequencePeriod = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}`

  const expenseId = await buildMonthlySequenceIdFromPostgres({
    tableName: 'expenses',
    idColumn: 'expense_id',
    prefix: 'EXP',
    period: sequencePeriod
  })

  const beneficiaryName = await resolveBeneficiaryName(payable)
  const memberId = payable.beneficiaryType === 'member' ? payable.beneficiaryId : null

  await createFinanceExpenseInPostgres({
    expenseId,
    clientId: null,
    spaceId: null,
    expenseType: 'contractor',
    sourceType: 'contractor_payable',
    description: `Pago contractor — ${beneficiaryName}`,
    currency: payable.currency,
    subtotal: gross,
    taxRate: taxWriteFields.taxRate,
    taxAmount: taxWriteFields.taxAmount,
    taxCode: taxWriteFields.taxCode,
    taxRecoverability: taxWriteFields.taxRecoverability,
    taxRateSnapshot: taxWriteFields.taxRateSnapshot,
    taxAmountSnapshot: taxWriteFields.taxAmountSnapshot,
    taxSnapshotJson: serializeExpenseTaxSnapshot(taxWriteFields.taxSnapshot),
    isTaxExempt: taxWriteFields.isTaxExempt,
    taxSnapshotFrozenAt: taxWriteFields.taxSnapshotFrozenAt,
    recoverableTaxAmount: taxWriteFields.recoverableTaxAmount,
    recoverableTaxAmountClp: taxWriteFields.recoverableTaxAmountClp,
    nonRecoverableTaxAmount: taxWriteFields.nonRecoverableTaxAmount,
    nonRecoverableTaxAmountClp: taxWriteFields.nonRecoverableTaxAmountClp,
    effectiveCostAmount: taxWriteFields.effectiveCostAmount,
    effectiveCostAmountClp: taxWriteFields.effectiveCostAmountClp,
    totalAmount: taxWriteFields.totalAmount,
    exchangeRateToClp,
    totalAmountClp: gross * exchangeRateToClp,
    paymentDate: null,
    paymentStatus: 'pending',
    paymentMethod: null,
    paymentProvider: null,
    paymentRail: 'contractor',
    paymentAccountId: null,
    paymentReference: null,
    documentNumber: null,
    documentDate: payable.dueDate ?? null,
    dueDate: payable.dueDate ?? null,
    supplierId: null,
    supplierName: null,
    supplierInvoiceNumber: null,
    payrollPeriodId: null,
    payrollEntryId: null,
    memberId,
    memberName: beneficiaryName,
    socialSecurityType: null,
    socialSecurityInstitution: null,
    socialSecurityPeriod: null,
    taxType: null,
    taxPeriod: null,
    taxFormNumber: null,
    miscellaneousCategory: null,
    serviceLine: null,
    isRecurring: false,
    recurrenceFrequency: null,
    costCategory: null,
    costIsDirect: false,
    allocatedClientId: null,
    directOverheadScope: 'none',
    directOverheadKind: null,
    directOverheadMemberId: null,
    receiptDate: null,
    purchaseType: null,
    vatUnrecoverableAmount: null,
    vatFixedAssetsAmount: null,
    vatCommonUseAmount: null,
    dteTypeCode: null,
    dteFolio: null,
    exemptAmount: null,
    otherTaxesAmount: null,
    // Audit only: the SII retention. NOT deducted from total_amount (gasto = bruto).
    withholdingAmount: toNumber(payable.withholdingAmount) || null,
    notes: `System-generated from contractor_payable.ready_for_finance (${payable.publicId})`,
    actorUserId: null,
    contractorPayableId: payable.contractorPayableId
  })

  return { created: true, expenseId, reason: `expense ${expenseId} created` }
}
