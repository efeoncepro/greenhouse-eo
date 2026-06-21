/**
 * TASK-1212 Slice 1 — orquestación del command submitQuoteFromBuilder.
 *
 * Cubre los invariantes del contrato: capability gate, save→issue como etapas
 * separadas, rollback honesto del header huérfano en create si el persist falla,
 * idempotencia (replay devuelve el resultado previo sin re-ejecutar), y mapeo de
 * unpriced line items. El "precio siempre del engine / no honra override" vive y se
 * testea en quote-builder-pricing.test.ts (buildPersistedQuoteLineItems).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const withTransactionMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (fn: (c: unknown) => unknown) => withTransactionMock(fn)
}))

const canMock = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({ can: (...args: unknown[]) => canMock(...args) }))

const persistMock = vi.fn()
const resolveIdentityMock = vi.fn()

vi.mock('@/lib/finance/pricing', () => ({
  persistQuotationPricing: (...args: unknown[]) => persistMock(...args),
  resolveQuotationIdentity: (...args: unknown[]) => resolveIdentityMock(...args)
}))

const engineMock = vi.fn()

vi.mock('@/lib/finance/pricing/pricing-engine-v2', () => ({
  buildPricingEngineOutputV2: (...args: unknown[]) => engineMock(...args)
}))

const buildLinesMock = vi.fn()

vi.mock('@/lib/finance/pricing/quote-builder-line-items', () => ({
  buildQuotePricingInput: () => null,
  buildPersistedQuoteLineItems: (...args: unknown[]) => buildLinesMock(...args)
}))

class UnpricedError extends Error {}
vi.mock('@/lib/finance/pricing/quotation-line-input-validation', () => ({
  UNPRICED_QUOTATION_LINE_ITEMS_MESSAGE: 'sin precio',
  isUnpricedQuotationLineItemsError: (e: unknown) => e instanceof UnpricedError
}))

const issueMock = vi.fn()

vi.mock('@/lib/commercial/quotation-issue-command', () => ({
  requestQuotationIssue: (...args: unknown[]) => issueMock(...args)
}))

vi.mock('@/lib/commercial/quotation-events', () => ({
  publishQuoteCreated: vi.fn(async () => {}),
  publishQuotationUpdated: vi.fn(async () => {}),
  publishTemplateUsed: vi.fn(async () => {})
}))
vi.mock('@/lib/commercial/governance/audit-log', () => ({ recordAudit: vi.fn(async () => {}) }))
vi.mock('@/lib/commercial/governance/templates-store', () => ({ recordTemplateUsage: vi.fn(async () => null) }))
vi.mock('@/lib/commercial/governance/terms-store', () => ({ seedQuotationDefaultTerms: vi.fn(async () => {}) }))
vi.mock('@/lib/commercial/deals-store', () => ({ getCommercialDealByHubSpotId: vi.fn(async () => null) }))
vi.mock('@/lib/commercial/quote-hubspot-sync-context', () => ({ validateHubSpotQuoteCommercialContext: () => null }))
vi.mock('@/lib/commercial/delivery-model', () => ({
  resolveQuoteDeliveryModel: () => ({ pricingModel: 'project', commercialModel: 'on_going', staffingModel: 'augmented' })
}))

const claimMock = vi.fn()
const loadMock = vi.fn()
const resolveDecisionMock = vi.fn()
const completeMock = vi.fn()
const failMock = vi.fn()
const incrementReplayMock = vi.fn()

vi.mock('@/lib/api-platform/core/idempotency', () => ({
  IDEMPOTENCY_TTL_MS: 1000,
  computeRequestFingerprint: () => 'fp',
  claimCommandExecution: (...args: unknown[]) => claimMock(...args),
  loadCommandExecutionByKey: (...args: unknown[]) => loadMock(...args),
  resolveIdempotencyDecision: (...args: unknown[]) => resolveDecisionMock(...args),
  completeCommandExecution: (...args: unknown[]) => completeMock(...args),
  failCommandExecution: (...args: unknown[]) => failMock(...args),
  incrementReplayCount: (...args: unknown[]) => incrementReplayMock(...args)
}))

import { submitQuoteFromBuilder } from './submit-quote-from-builder'

const subject = {
  userId: 'user-1',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['internal'],
  authorizedViews: []
}

const baseInput = () => ({
  mode: 'create' as const,
  header: { organizationId: 'org-1', currency: 'CLP' as const },
  lines: [],
  issueAfterSave: false,
  subject,
  actor: { userId: 'user-1', name: 'Agente' }
})

beforeEach(() => {
  vi.clearAllMocks()
  canMock.mockReturnValue(true)
  queryMock.mockImplementation(async (text: string) => {
    if (text.includes('FROM greenhouse_core.organizations')) {
      return [{ organization_id: 'org-1', hubspot_company_id: null }]
    }

    return []
  })
  withTransactionMock.mockImplementation(async (fn: (c: unknown) => unknown) =>
    fn({ query: async () => ({ rows: [{ quotation_id: 'q-1' }] }) })
  )
  persistMock.mockResolvedValue({ totals: { totalPrice: 1000 }, lineItems: [{ lineItemId: 'l-1' }], versionNumber: 1 })
  buildLinesMock.mockReturnValue([])
})

afterEach(() => vi.restoreAllMocks())

describe('submitQuoteFromBuilder — capability gate', () => {
  it('rechaza con forbidden si no tiene commercial.quotation create', async () => {
    canMock.mockReturnValue(false)

    await expect(submitQuoteFromBuilder(baseInput())).rejects.toMatchObject({ code: 'forbidden' })
    expect(persistMock).not.toHaveBeenCalled()
  })

  it('exige approve (además de create) cuando issueAfterSave=true', async () => {
    canMock.mockImplementation((_s: unknown, _cap: unknown, action: string) => action !== 'approve')

    await expect(submitQuoteFromBuilder({ ...baseInput(), issueAfterSave: true })).rejects.toMatchObject({
      code: 'forbidden'
    })
  })
})

describe('submitQuoteFromBuilder — save → issue como etapas separadas', () => {
  it('create sin issue persiste y NO llama issue; finalState=draft', async () => {
    const result = await submitQuoteFromBuilder(baseInput())

    expect(persistMock).toHaveBeenCalledTimes(1)
    expect(issueMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({ quotationId: 'q-1', finalState: 'draft', issued: false })
  })

  it('create con issueAfterSave persiste y LUEGO emite; finalState=issued', async () => {
    issueMock.mockResolvedValue({ issued: true, approvalRequired: false, newStatus: 'issued' })

    const result = await submitQuoteFromBuilder({ ...baseInput(), issueAfterSave: true })

    expect(persistMock).toHaveBeenCalledTimes(1)
    expect(issueMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ finalState: 'issued', issued: true, approvalRequired: false })
  })

  it('issue con approval requerido deja finalState=pending_approval', async () => {
    issueMock.mockResolvedValue({ issued: false, approvalRequired: true, newStatus: 'pending_approval' })

    const result = await submitQuoteFromBuilder({ ...baseInput(), issueAfterSave: true })

    expect(result).toMatchObject({ finalState: 'pending_approval', issued: false, approvalRequired: true })
  })
})

describe('submitQuoteFromBuilder — rollback honesto en create', () => {
  it('borra el header huérfano si el persist falla', async () => {
    persistMock.mockRejectedValue(new Error('persist boom'))

    await expect(submitQuoteFromBuilder(baseInput())).rejects.toThrow('persist boom')

    const deleteCall = queryMock.mock.calls.find(
      ([text]) => typeof text === 'string' && text.includes('DELETE FROM greenhouse_commercial.quotations')
    )

    expect(deleteCall?.[1]).toEqual(['q-1'])
  })

  it('mapea unpriced line items a SubmitQuoteError', async () => {
    persistMock.mockRejectedValue(new UnpricedError('sin precio — revisa la línea'))

    await expect(submitQuoteFromBuilder(baseInput())).rejects.toMatchObject({ code: 'unpriced_line_items' })
  })
})

describe('submitQuoteFromBuilder — idempotencia', () => {
  it('replay devuelve el resultado previo sin re-ejecutar', async () => {
    claimMock.mockResolvedValue({ claimed: false })
    loadMock.mockResolvedValue({ status: 'completed' })
    resolveDecisionMock.mockReturnValue({
      kind: 'replay',
      responseStatus: 200,
      responseBody: { operationId: 'op-prev', quotationId: 'q-prev', mode: 'create', finalState: 'issued', lineCount: 2, issued: true, approvalRequired: false, replayed: false }
    })

    const result = await submitQuoteFromBuilder({ ...baseInput(), idempotencyKey: 'idem-1' })

    expect(persistMock).not.toHaveBeenCalled()
    expect(incrementReplayMock).toHaveBeenCalled()
    expect(result).toMatchObject({ quotationId: 'q-prev', replayed: true })
  })

  it('primer claim ejecuta y marca completed', async () => {
    claimMock.mockResolvedValue({ claimed: true, commandExecutionId: 'cmd-1' })

    const result = await submitQuoteFromBuilder({ ...baseInput(), idempotencyKey: 'idem-2' })

    expect(persistMock).toHaveBeenCalledTimes(1)
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ commandExecutionId: 'cmd-1' }))
    expect(result).toMatchObject({ operationId: 'cmd-1', replayed: false })
  })

  it('conflict (payload distinto con mismo key) lanza idempotency_conflict', async () => {
    claimMock.mockResolvedValue({ claimed: false })
    loadMock.mockResolvedValue({ status: 'completed' })
    resolveDecisionMock.mockReturnValue({ kind: 'conflict' })

    await expect(submitQuoteFromBuilder({ ...baseInput(), idempotencyKey: 'idem-3' })).rejects.toMatchObject({
      code: 'idempotency_conflict'
    })
  })
})
