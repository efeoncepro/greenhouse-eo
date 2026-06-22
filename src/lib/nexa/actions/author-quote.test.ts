/**
 * TASK-1212 Slice 4 — governed action author_quote (autoría parametrizada).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const submitMock = vi.fn()

vi.mock('@/lib/commercial/submit-quote-from-builder', () => ({
  submitQuoteFromBuilder: (...args: unknown[]) => submitMock(...args)
}))

const canMock = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({ can: (...args: unknown[]) => canMock(...args) }))

const runtimeFlag = vi.fn()
const actionFlag = vi.fn()

vi.mock('../flags', () => ({
  isNexaActionRuntimeEnabled: () => runtimeFlag(),
  isNexaQuoteAuthorActionEnabled: () => actionFlag()
}))

import { authorQuoteAction } from './author-quote'

const context = {
  userId: 'user-1',
  memberId: 'm-1',
  clientId: null,
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal']
}

const input = {
  mode: 'create' as const,
  header: { organizationId: 'org-1', currency: 'CLP' as const },
  lines: [{ label: 'Discovery', lineType: 'direct_cost' as const, unit: 'project' as const, quantity: 1, unitPrice: 1000 }],
  issueAfterSave: false
}

beforeEach(() => {
  vi.clearAllMocks()
  runtimeFlag.mockReturnValue(true)
  actionFlag.mockReturnValue(true)
  canMock.mockReturnValue(true)
  submitMock.mockResolvedValue({ quotationId: 'q-1', operationId: 'op-1', finalState: 'draft', lineCount: 1, issued: false })
})

afterEach(() => vi.restoreAllMocks())

describe('authorQuoteAction', () => {
  it('declara inputSchema (acción parametrizada) y domain commercial-q2c', () => {
    expect(authorQuoteAction.inputSchema).toBeDefined()
    expect(authorQuoteAction.domain).toBe('commercial-q2c')
    expect(authorQuoteAction.requiredCapability).toBe('commercial.quotation')
  })

  it('isEnabled exige runtime master + per-action flag', () => {
    expect(authorQuoteAction.isEnabled()).toBe(true)
    actionFlag.mockReturnValue(false)
    expect(authorQuoteAction.isEnabled()).toBe(false)
    actionFlag.mockReturnValue(true)
    runtimeFlag.mockReturnValue(false)
    expect(authorQuoteAction.isEnabled()).toBe(false)
  })

  it('isPermitted refleja can(commercial.quotation, create)', () => {
    expect(authorQuoteAction.isPermitted(context)).toBe(true)
    expect(canMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', primaryRoleCode: 'efeonce_admin' }),
      'commercial.quotation',
      'create',
      'tenant'
    )

    canMock.mockReturnValue(false)
    expect(authorQuoteAction.isPermitted(context)).toBe(false)
  })

  it('buildPreview es read-only y resume líneas + intención de emisión', async () => {
    const preview = await authorQuoteAction.buildPreview(context, input)

    expect(submitMock).not.toHaveBeenCalled()
    expect(preview.metrics).toContainEqual({ label: 'Emitir', value: 'No (borrador)' })
    expect(preview.metrics).toContainEqual({ label: 'Líneas', value: '1' })

    const issuePreview = await authorQuoteAction.buildPreview(context, { ...input, issueAfterSave: true })

    expect(issuePreview.metrics).toContainEqual({ label: 'Emitir', value: 'Sí' })
  })

  it('execute delega en el command con subject+actor del context y SIN idempotencyKey', async () => {
    const result = await authorQuoteAction.execute(context, input)

    expect(submitMock).toHaveBeenCalledTimes(1)
    const call = submitMock.mock.calls[0][0]

    expect(call.subject).toMatchObject({ userId: 'user-1', tenantType: 'efeonce_internal', memberId: 'm-1' })
    expect(call.actor).toEqual({ userId: 'user-1', name: 'user-1' })
    expect('idempotencyKey' in call).toBe(false)
    expect(result).toMatchObject({ ok: true })
    expect(result.raw).toMatchObject({ quotationId: 'q-1', finalState: 'draft' })
  })

  it('execute resume estado emitido', async () => {
    submitMock.mockResolvedValue({ quotationId: 'q-2', operationId: 'op-2', finalState: 'issued', lineCount: 2, issued: true })

    const result = await authorQuoteAction.execute(context, { ...input, issueAfterSave: true })

    expect(result.summary).toContain('emití')
  })
})
