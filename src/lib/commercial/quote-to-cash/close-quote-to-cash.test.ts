import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn(() => true) }))

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }))

vi.mock('@/lib/api-platform/core/idempotency', () => ({
  IDEMPOTENCY_TTL_MS: 86_400_000,
  claimCommandExecution: vi.fn(),
  completeCommandExecution: vi.fn(),
  computeRequestFingerprint: vi.fn(() => 'fp-1'),
  failCommandExecution: vi.fn(),
  incrementReplayCount: vi.fn(),
  loadCommandExecutionByKey: vi.fn(),
  resolveIdempotencyDecision: vi.fn()
}))

vi.mock('@/lib/commercial/party/commands/convert-quote-to-cash', () => ({ convertQuoteToCash: vi.fn() }))

vi.mock('@/lib/commercial/party/commands/commercial-operations-audit', () => ({
  startCorrelatedOperation: vi.fn(),
  completeOperation: vi.fn()
}))

vi.mock('@/lib/finance/quote-to-cash/materialize-invoice-from-quotation', () => ({
  ensureIncomeFromQuotation: vi.fn()
}))

vi.mock('@/lib/finance/quote-to-cash/materialize-invoice-from-hes', () => ({
  ensureIncomeFromHes: vi.fn()
}))

vi.mock('./flags', () => ({
  CONTRACT_ONLY_SLA_DAYS: 14,
  isQ2cContractOnlyEnabled: vi.fn(() => false)
}))

import { can } from '@/lib/entitlements/runtime'
import { query, withTransaction } from '@/lib/db'
import {
  claimCommandExecution,
  loadCommandExecutionByKey,
  resolveIdempotencyDecision
} from '@/lib/api-platform/core/idempotency'
import { convertQuoteToCash } from '@/lib/commercial/party/commands/convert-quote-to-cash'
import {
  completeOperation,
  startCorrelatedOperation
} from '@/lib/commercial/party/commands/commercial-operations-audit'
import { QuoteToCashApprovalRequiredError } from '@/lib/commercial/party/commands/convert-quote-to-cash-types'
import { ensureIncomeFromQuotation } from '@/lib/finance/quote-to-cash/materialize-invoice-from-quotation'
import { ensureIncomeFromHes } from '@/lib/finance/quote-to-cash/materialize-invoice-from-hes'

import { closeQuoteToCash, CloseQuoteToCashError } from './close-quote-to-cash'
import { isQ2cContractOnlyEnabled } from './flags'

const mockedCan = can as unknown as ReturnType<typeof vi.fn>
const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedClaim = claimCommandExecution as unknown as ReturnType<typeof vi.fn>
const mockedLoad = loadCommandExecutionByKey as unknown as ReturnType<typeof vi.fn>
const mockedDecision = resolveIdempotencyDecision as unknown as ReturnType<typeof vi.fn>
const mockedConvert = convertQuoteToCash as unknown as ReturnType<typeof vi.fn>
const mockedStartOp = startCorrelatedOperation as unknown as ReturnType<typeof vi.fn>
const mockedCompleteOp = completeOperation as unknown as ReturnType<typeof vi.fn>
const mockedEnsureIncome = ensureIncomeFromQuotation as unknown as ReturnType<typeof vi.fn>
const mockedEnsureIncomeHes = ensureIncomeFromHes as unknown as ReturnType<typeof vi.fn>
const mockedContractOnlyEnabled = isQ2cContractOnlyEnabled as unknown as ReturnType<typeof vi.fn>

const subject = {
  userId: 'user-1',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: [],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/'
} as never

const actor = { userId: 'user-1', tenantScope: 'efeonce_internal:system', name: 'User' }

const baseInput = {
  quotationId: 'qt-1',
  strategy: 'simple_invoice' as const,
  subject,
  actor
}

const issuedRow = {
  quotation_id: 'qt-1',
  status: 'issued',
  organization_id: 'org-1',
  client_id: 'cli-1',
  hubspot_deal_id: null,
  converted_to_income_id: null,
  total_amount_clp: 1_000_000,
  total_amount: 1_000_000
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedCan.mockReturnValue(true)
  mockedContractOnlyEnabled.mockReturnValue(false)
  mockedQuery.mockResolvedValue([issuedRow])
  mockedWithTransaction.mockImplementation(async (cb: (c: unknown) => unknown) => cb({ query: vi.fn() }))
})

describe('closeQuoteToCash — simple_invoice', () => {
  it('materializes income BEFORE converting and links the incomeId', async () => {
    mockedEnsureIncome.mockResolvedValueOnce({ incomeId: 'INC-1', quotationId: 'qt-1', totalAmountClp: 1_000_000, created: true })
    mockedConvert.mockResolvedValueOnce({
      operationId: 'op-1',
      correlationId: 'corr-1',
      status: 'completed',
      quotationId: 'qt-1',
      contractId: 'ctr-1',
      clientId: 'cli-1',
      organizationId: 'org-1',
      hubspotDealId: null,
      incomeId: 'INC-1'
    })

    const result = await closeQuoteToCash(baseInput)

    // income primero, convert después.
    const incomeOrder = mockedEnsureIncome.mock.invocationCallOrder[0]
    const convertOrder = mockedConvert.mock.invocationCallOrder[0]

    expect(incomeOrder).toBeLessThan(convertOrder)
    expect(mockedConvert).toHaveBeenCalledWith(
      expect.objectContaining({ quotationId: 'qt-1', skipApprovalGate: true, incomeId: 'INC-1' })
    )
    expect(result.finalState).toBe('converted')
    expect(result.incomeId).toBe('INC-1')
    expect(result.contractId).toBe('ctr-1')
  })

  it('does NOT create a second income on replay (idempotent primitive returns created=false)', async () => {
    // Replay tras fallo: el income ya existía → created=false, mismo incomeId.
    mockedEnsureIncome.mockResolvedValueOnce({ incomeId: 'INC-1', quotationId: 'qt-1', totalAmountClp: 0, created: false })
    mockedConvert.mockResolvedValueOnce({
      operationId: 'op-1',
      correlationId: 'corr-1',
      status: 'idempotent_hit',
      quotationId: 'qt-1',
      contractId: 'ctr-1',
      clientId: 'cli-1',
      organizationId: 'org-1',
      hubspotDealId: null,
      incomeId: 'INC-1'
    })

    const result = await closeQuoteToCash(baseInput)

    expect(result.incomeId).toBe('INC-1')
    expect(mockedEnsureIncome).toHaveBeenCalledTimes(1)
  })
})

describe('closeQuoteToCash — ledger idempotency (anti double-income)', () => {
  it('returns the prior result without re-running executeClose on a ledger replay', async () => {
    mockedClaim.mockResolvedValueOnce({ claimed: false })
    mockedLoad.mockResolvedValueOnce({ status: 'completed', requestFingerprint: 'fp-1', responseStatus: 200, responseBody: { incomeId: 'INC-1', finalState: 'converted' } })
    mockedDecision.mockReturnValueOnce({ kind: 'replay', responseStatus: 200, responseBody: { incomeId: 'INC-1', finalState: 'converted' } })

    const result = await closeQuoteToCash({ ...baseInput, idempotencyKey: 'key-1' })

    expect(result.replayed).toBe(true)
    expect(result.incomeId).toBe('INC-1')
    // executeClose NO corre → NO segundo income ni segunda conversión.
    expect(mockedEnsureIncome).not.toHaveBeenCalled()
    expect(mockedConvert).not.toHaveBeenCalled()
  })

  it('throws idempotency_in_progress when a concurrent op owns the key', async () => {
    mockedClaim.mockResolvedValueOnce({ claimed: false })
    mockedLoad.mockResolvedValueOnce({ status: 'processing', requestFingerprint: 'fp-1', responseStatus: null, responseBody: null })
    mockedDecision.mockReturnValueOnce({ kind: 'in_progress' })

    await expect(closeQuoteToCash({ ...baseInput, idempotencyKey: 'key-1' })).rejects.toMatchObject({
      code: 'idempotency_in_progress'
    })
    expect(mockedEnsureIncome).not.toHaveBeenCalled()
  })
})

describe('closeQuoteToCash — approval pre-gate', () => {
  it('does NOT materialize income when the threshold gate fires', async () => {
    mockedQuery.mockResolvedValueOnce([{ ...issuedRow, total_amount_clp: 200_000_000, total_amount: 200_000_000 }])
    mockedConvert.mockRejectedValueOnce(new QuoteToCashApprovalRequiredError('qt-1', 200_000_000, 100_000_000, 'appr-1'))

    await expect(closeQuoteToCash(baseInput)).rejects.toBeInstanceOf(QuoteToCashApprovalRequiredError)

    // Gate ANTES de income: nunca se crea AR antes de la aprobación.
    expect(mockedEnsureIncome).not.toHaveBeenCalled()
    expect(mockedConvert).toHaveBeenCalledWith(expect.objectContaining({ skipApprovalGate: false }))
  })
})

describe('closeQuoteToCash — contract_only (suspended, never terminal)', () => {
  it('throws contract_only_disabled when the flag is OFF', async () => {
    mockedContractOnlyEnabled.mockReturnValue(false)

    await expect(closeQuoteToCash({ ...baseInput, strategy: 'contract_only', reason: 'pendiente OC' })).rejects.toMatchObject({
      code: 'contract_only_disabled'
    })
    expect(mockedConvert).not.toHaveBeenCalled()
  })

  it('records a suspended audit (never converts) when the flag is ON', async () => {
    mockedContractOnlyEnabled.mockReturnValue(true)
    mockedStartOp.mockResolvedValueOnce({ operationId: 'op-9', correlationId: 'corr-9' })
    mockedCompleteOp.mockResolvedValueOnce(undefined)

    const result = await closeQuoteToCash({ ...baseInput, strategy: 'contract_only', reason: 'pendiente OC cliente' })

    expect(result.finalState).toBe('suspended')
    expect(result.incomeId).toBeNull()
    expect(mockedConvert).not.toHaveBeenCalled()
    expect(mockedEnsureIncome).not.toHaveBeenCalled()
    expect(mockedCompleteOp).toHaveBeenCalledWith(
      expect.anything(),
      'op-9',
      expect.objectContaining({ status: 'suspended' })
    )
  })

  it('rejects contract_only without a reason', async () => {
    mockedContractOnlyEnabled.mockReturnValue(true)

    await expect(closeQuoteToCash({ ...baseInput, strategy: 'contract_only' })).rejects.toMatchObject({
      code: 'invalid_input'
    })
  })
})

describe('closeQuoteToCash — guards', () => {
  it('throws forbidden when the subject lacks the capability', async () => {
    mockedCan.mockReturnValue(false)

    await expect(closeQuoteToCash(baseInput)).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('throws missing_hes for enterprise_hes without sourceHesId', async () => {
    await expect(closeQuoteToCash({ ...baseInput, strategy: 'enterprise_hes' })).rejects.toMatchObject({
      code: 'missing_hes'
    })
    expect(mockedEnsureIncomeHes).not.toHaveBeenCalled()
  })

  it('throws quotation_not_found when the quote does not exist', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await expect(closeQuoteToCash(baseInput)).rejects.toBeInstanceOf(CloseQuoteToCashError)
  })

  it('throws quotation_not_convertible for a non-open status', async () => {
    mockedQuery.mockResolvedValueOnce([{ ...issuedRow, status: 'draft' }])

    await expect(closeQuoteToCash(baseInput)).rejects.toMatchObject({ code: 'quotation_not_convertible' })
  })
})
