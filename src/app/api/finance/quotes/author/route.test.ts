/**
 * TASK-1212 Slice 2 — endpoint canónico de autoría POST /api/finance/quotes/author.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const tenantMock = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireCommercialTenantContext: () => tenantMock()
}))

const submitMock = vi.fn()

vi.mock('@/lib/commercial/submit-quote-from-builder', () => {
  class FakeSubmitError extends Error {
    code: string
    actionable = false

    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }

  return {
    submitQuoteFromBuilder: (...args: unknown[]) => submitMock(...args),
    SubmitQuoteError: FakeSubmitError
  }
})

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/observability/redact', () => ({ redactErrorForResponse: (e: unknown) => e }))
vi.mock('@/lib/api/canonical-error-response', () => ({
  canonicalErrorResponse: (code: string) =>
    new Response(JSON.stringify({ error: code }), { status: code === 'unauthorized' ? 401 : 500 })
}))

import { POST } from './route'
import { SubmitQuoteError } from '@/lib/commercial/submit-quote-from-builder'

const tenant = {
  userId: 'user-1',
  clientName: 'Agente',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['internal'],
  authorizedViews: []
}

const req = (body: unknown) =>
  new Request('http://localhost/api/finance/quotes/author', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

const validCreate = {
  mode: 'create',
  header: { organizationId: 'org-1', currency: 'CLP' },
  lines: [],
  issueAfterSave: false
}

beforeEach(() => {
  vi.clearAllMocks()
  tenantMock.mockResolvedValue({ tenant, errorResponse: null })
  submitMock.mockResolvedValue({ quotationId: 'q-1', mode: 'create', finalState: 'draft', issued: false })
})

describe('POST /api/finance/quotes/author', () => {
  it('401 si no hay tenant', async () => {
    tenantMock.mockResolvedValue({ tenant: null, errorResponse: null })

    const res = await POST(req(validCreate))

    expect(res.status).toBe(401)
  })

  it('201 en create válido y delega en el command con subject+actor de sesión', async () => {
    const res = await POST(req(validCreate))

    expect(res.status).toBe(201)
    const call = submitMock.mock.calls[0][0]

    expect(call.subject).toMatchObject({ userId: 'user-1' })
    expect(call.actor).toEqual({ userId: 'user-1', name: 'Agente' })
  })

  it('400 si el payload no pasa el schema', async () => {
    const res = await POST(req({ mode: 'edit', header: { currency: 'CLP' }, lines: [] }))

    expect(res.status).toBe(400)
    expect(submitMock).not.toHaveBeenCalled()
  })

  it('403 cuando el command lanza SubmitQuoteError forbidden', async () => {
    submitMock.mockRejectedValue(new SubmitQuoteError('forbidden', 'No tienes permiso'))

    const res = await POST(req(validCreate))

    expect(res.status).toBe(403)
    const body = await res.json()

    expect(body).toMatchObject({ code: 'forbidden' })
  })

  it('409 en idempotency_conflict', async () => {
    submitMock.mockRejectedValue(new SubmitQuoteError('idempotency_conflict', 'key reusado'))

    const res = await POST(req(validCreate))

    expect(res.status).toBe(409)
  })
})
