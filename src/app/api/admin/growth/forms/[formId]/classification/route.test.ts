import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantContext, permission, command, definition, capture } = vi.hoisted(() => ({ tenantContext: vi.fn(), permission: vi.fn(), command: vi.fn(), definition: vi.fn(), capture: vi.fn() }))

vi.mock('@/lib/tenant/authorization', () => ({ requireInternalTenantContext: tenantContext }))
vi.mock('@/lib/entitlements/runtime', () => ({ can: permission }))
vi.mock('@/lib/growth/forms/classification', () => ({ correctCommercialFormClassification: command }))
vi.mock('@/lib/growth/forms/store', () => ({ getFormDefinitionById: definition }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: capture }))

import { POST } from './route'
import { FormClassificationConflictError } from '@/lib/growth/forms/classification-contract'

const body = { formKey: '11111111-1111-4111-8111-111111111111', expectedDefinitionSha256: 'a'.repeat(64), expectedPublishedVersionId: 'fver-fixture', fromFormKind: 'lead_magnet', toFormKind: 'quote_request', commercialIntentConfirmed: true, reason: 'Operator confirmed commercial service intent' }
const context = () => ({ params: Promise.resolve({ formId: 'fdef-fixture' }) })
const request = (input = body) => new Request('https://example.invalid/api/admin/growth/forms/fdef-fixture/classification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })

beforeEach(() => {
  vi.clearAllMocks()
  tenantContext.mockResolvedValue({ tenant: { userId: 'authenticated-author' } })
  permission.mockReturnValue(true)
  definition.mockResolvedValue({ form_key: body.formKey })
  command.mockResolvedValue({ ok: true, formKind: 'quote_request' })
})

describe('internal Forms classification API', () => {
  it('uses authenticated author identity and the shared command', async () => {
    const response = await POST(request(), context())

    expect(response.status).toBe(200)
    expect(permission).toHaveBeenCalledWith({ userId: 'authenticated-author' }, 'growth.forms.author', 'execute', 'tenant')
    expect(command).toHaveBeenCalledWith(body, 'authenticated-author')
  })

  it('denies missing internal context before reading or writing the source', async () => {
    tenantContext.mockResolvedValue({ tenant: null })
    expect((await POST(request(), context())).status).toBe(401)
    expect(definition).not.toHaveBeenCalled()
    expect(command).not.toHaveBeenCalled()
  })

  it('denies read-only actors before reading or writing the source', async () => {
    permission.mockReturnValue(false)
    expect((await POST(request(), context())).status).toBe(403)
    expect(command).not.toHaveBeenCalled()
  })

  it('rejects supplied identity or destination authority', async () => {
    const response = await POST(request({ ...body, actorId: 'forged' } as typeof body), context())

    expect(response.status).toBe(400)
    expect(command).not.toHaveBeenCalled()
  })

  it('rejects a mismatched path identity before the command', async () => {
    definition.mockResolvedValue({ form_key: '22222222-2222-4222-8222-222222222222' })
    expect((await POST(request(), context())).status).toBe(409)
    expect(command).not.toHaveBeenCalled()
  })

  it('reports canonical conflict on stale metadata without exposing details', async () => {
    command.mockRejectedValue(new FormClassificationConflictError())
    const response = await POST(request(), context())

    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('growth_form_classification_conflict')
    expect(capture).not.toHaveBeenCalled()
  })
})
