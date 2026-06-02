import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const createExpenseMock = vi.fn()
const queryMock = vi.fn()

vi.mock('@/lib/finance/postgres-store-slice2', () => ({
  buildMonthlySequenceIdFromPostgres: vi.fn(async () => 'EXP-202605-001'),
  createFinanceExpenseInPostgres: (...args: unknown[]) => createExpenseMock(...args)
}))

vi.mock('@/lib/finance/expense-tax-snapshot', () => ({
  buildExpenseTaxWriteFields: vi.fn(async () => ({
    taxRate: 0,
    taxAmount: 0,
    taxCode: 'cl_vat_non_billable',
    taxRecoverability: null,
    taxRateSnapshot: 0,
    taxAmountSnapshot: 0,
    taxSnapshot: {},
    isTaxExempt: false,
    taxSnapshotFrozenAt: '2026-05-31T00:00:00Z',
    recoverableTaxAmount: 0,
    recoverableTaxAmountClp: 0,
    nonRecoverableTaxAmount: 0,
    nonRecoverableTaxAmountClp: 0,
    effectiveCostAmount: 0,
    effectiveCostAmountClp: 0,
    totalAmount: 0
  })),
  serializeExpenseTaxSnapshot: vi.fn(() => '{}')
}))

vi.mock('@/lib/finance/shared', () => ({
  resolveExchangeRateToClp: vi.fn(async () => 1)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args)
}))

import { materializeContractorPayableExpense } from './contractor-payable-expense-reactive'
import type { ContractorPayable } from '@/lib/contractor-engagements/payables/types'

const basePayable = (overrides: Partial<ContractorPayable>): ContractorPayable =>
  ({
    contractorPayableId: 'cpay-1',
    publicId: 'EO-CPAY-0001',
    contractorEngagementId: 'ceng-1',
    contractorWorkSubmissionId: null,
    contractorInvoiceId: null,
    payableSourceKind: 'work_submission',
    beneficiaryType: 'member',
    beneficiaryId: 'member-1',
    grossAmount: 600000,
    withholdingAmount: 91500,
    netPayable: 508500,
    currency: 'CLP',
    paymentCurrency: null,
    fxPolicyCode: null,
    taxComplianceOwner: 'greenhouse_policy',
    taxWithholdingPolicyCode: 'cl_honorarios_2026_15_25',
    economicCategory: 'labor_cost_external',
    payrollVia: 'internal',
    paymentProfileId: null,
    paymentProfileWaiverReason: null,
    agreedAmountOverrideReason: null,
    dueDate: null,
    status: 'ready_for_finance',
    financeObligationId: null,
    paymentOrderId: null,
    readiness: {},
    sourceSnapshot: {},
    createdByUserId: null,
    createdAt: '2026-05-31T00:00:00Z',
    updatedAt: '2026-05-31T00:00:00Z',
    ...overrides
  }) as ContractorPayable

describe('TASK-977 materializeContractorPayableExpense', () => {
  it('skips (no DB write) when the payable is not committed (cancelled/blocked/pending)', async () => {
    createExpenseMock.mockReset()
    queryMock.mockReset()

    for (const status of ['pending_readiness', 'blocked', 'cancelled'] as const) {
      const result = await materializeContractorPayableExpense(basePayable({ status }))

      expect(result.created).toBe(false)
      expect(result.reason).toContain('not committed')
    }

    // The gate returns BEFORE any DB lookup or expense creation.
    expect(queryMock).not.toHaveBeenCalled()
    expect(createExpenseMock).not.toHaveBeenCalled()
  })

  it('skips (idempotent) when the expense already exists for the payable', async () => {
    createExpenseMock.mockReset()
    queryMock.mockReset()
    queryMock.mockResolvedValueOnce([{ expense_id: 'EXP-202605-000' }])

    const result = await materializeContractorPayableExpense(basePayable({ status: 'obligation_created' }))

    expect(result.created).toBe(false)
    expect(result.reason).toContain('already materialized')
    expect(createExpenseMock).not.toHaveBeenCalled()
  })

  it('materializes the expense as GROSS + labor_cost_external + contractor anchor when committed', async () => {
    createExpenseMock.mockReset()
    queryMock.mockReset()
    // 1st query: dedup (none). 2nd query: beneficiary name lookup.
    queryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ display_name: 'Valentina Hoyos' }])

    const result = await materializeContractorPayableExpense(basePayable({ status: 'ready_for_finance' }))

    expect(result.created).toBe(true)
    expect(createExpenseMock).toHaveBeenCalledTimes(1)

    const arg = createExpenseMock.mock.calls[0][0] as Record<string, unknown>

    // Accounting: expense recognizes the GROSS (the withholding is a separate liability).
    expect(arg.subtotal).toBe(600000)
    expect(arg.expenseType).toBe('contractor')
    expect(arg.sourceType).toBe('contractor_payable')
    expect(arg.contractorPayableId).toBe('cpay-1')
    expect(arg.supplierId).toBeNull()
    expect(arg.memberId).toBe('member-1')
    // Withholding recorded for audit only.
    expect(arg.withholdingAmount).toBe(91500)
  })
})
