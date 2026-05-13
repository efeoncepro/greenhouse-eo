/**
 * TASK-826 Slice 6 — Integration tests for admin client_portal endpoints.
 *
 * Cubre los 4 endpoints canónicos:
 *   1. GET    /api/admin/client-portal/organizations/[orgId]/modules — listing
 *   2. POST   /api/admin/client-portal/organizations/[orgId]/modules — enable
 *   3. PATCH  /api/admin/client-portal/assignments/[id] — pause|resume|expire|churn
 *   4. GET    /api/admin/client-portal/catalog — read-only catalog
 *
 * Doble gate canónico TASK-839 mirror:
 *   - `requireAdminTenantContext()` broad gate (404 si no admin)
 *   - `can(tenant, capability, action, scope)` fine gate granular per endpoint
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminTenantContext: vi.fn(),
  can: vi.fn(),
  enableModule: vi.fn(),
  pauseModule: vi.fn(),
  resumeModule: vi.fn(),
  expireModule: vi.fn(),
  churnModule: vi.fn(),
  query: vi.fn(),
  captureWithDomain: vi.fn(),
  redactErrorForResponse: vi.fn((e: unknown) => (e instanceof Error ? e.message : 'redacted'))
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mocks.requireAdminTenantContext()
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => mocks.can(...args)
}))

vi.mock('@/lib/client-portal/commands/enable-module', () => ({
  enableClientPortalModule: (...args: unknown[]) => mocks.enableModule(...args)
}))

vi.mock('@/lib/client-portal/commands/pause-resume', () => ({
  pauseClientPortalModule: (...args: unknown[]) => mocks.pauseModule(...args),
  resumeClientPortalModule: (...args: unknown[]) => mocks.resumeModule(...args)
}))

vi.mock('@/lib/client-portal/commands/expire-churn', () => ({
  expireClientPortalModule: (...args: unknown[]) => mocks.expireModule(...args),
  churnClientPortalModule: (...args: unknown[]) => mocks.churnModule(...args)
}))

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mocks.query(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (e: unknown) => mocks.redactErrorForResponse(e)
}))

const ADMIN_TENANT = {
  userId: 'user-admin-1',
  spaceId: 'space-1',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin']
}

const mkRequest = (body?: unknown): Request =>
  new Request('http://localhost/api/admin/client-portal/test', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminTenantContext.mockResolvedValue({ tenant: ADMIN_TENANT, errorResponse: null })
  mocks.can.mockReturnValue(true)
})

describe('GET /api/admin/client-portal/organizations/[orgId]/modules', () => {
  it('200 OK with assignments listing', async () => {
    mocks.query.mockResolvedValueOnce([
      {
        assignment_id: 'cpma-1',
        organization_id: 'org-1',
        module_key: 'creative_hub_globe_v1',
        status: 'active',
        source: 'manual_admin',
        effective_from: '2026-05-01',
        effective_to: null,
        expires_at: null,
        approved_by_user_id: 'user-1',
        approved_at: '2026-05-01T10:00:00Z',
        created_at: '2026-05-01T10:00:00Z',
        updated_at: '2026-05-01T10:00:00Z',
        module_display_label: 'Creative Hub Globe',
        module_applicability_scope: 'globe',
        module_tier: 'standard'
      }
    ])

    const { GET } = await import('../organizations/[organizationId]/modules/route')

    const response = await GET(new Request('http://localhost/'), {
      params: Promise.resolve({ organizationId: 'org-1' })
    })

    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.total).toBe(1)
    expect(json.items[0]).toMatchObject({
      assignmentId: 'cpma-1',
      moduleKey: 'creative_hub_globe_v1',
      status: 'active'
    })
  })

  it('401 when no admin context', async () => {
    mocks.requireAdminTenantContext.mockResolvedValueOnce({
      tenant: null,
      errorResponse: new Response('Unauthorized', { status: 401 })
    })

    const { GET } = await import('../organizations/[organizationId]/modules/route')

    const response = await GET(new Request('http://localhost/'), {
      params: Promise.resolve({ organizationId: 'org-1' })
    })

    expect(response.status).toBe(401)
  })

  it('403 when admin but lacks read_assignment capability', async () => {
    mocks.can.mockReturnValue(false)

    const { GET } = await import('../organizations/[organizationId]/modules/route')

    const response = await GET(new Request('http://localhost/'), {
      params: Promise.resolve({ organizationId: 'org-1' })
    })

    expect(response.status).toBe(403)
    expect(mocks.can).toHaveBeenCalledWith(
      ADMIN_TENANT,
      'client_portal.module.read_assignment',
      'read',
      'tenant'
    )
  })
})

describe('POST /api/admin/client-portal/organizations/[orgId]/modules (enable)', () => {
  it('201 created on happy path', async () => {
    mocks.enableModule.mockResolvedValueOnce({
      assignmentId: 'cpma-new-1',
      status: 'active',
      idempotent: false
    })

    const { POST } = await import('../organizations/[organizationId]/modules/route')

    const response = await POST(
      mkRequest({
        moduleKey: 'creative_hub_globe_v1',
        source: 'manual_admin',
        effectiveFrom: '2026-05-12'
      }),
      { params: Promise.resolve({ organizationId: 'org-1' }) }
    )

    expect(response.status).toBe(201)
    expect(mocks.enableModule).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        moduleKey: 'creative_hub_globe_v1',
        source: 'manual_admin',
        approvedByUserId: 'user-admin-1'
      })
    )
  })

  it('200 with idempotent flag when assignment already exists', async () => {
    mocks.enableModule.mockResolvedValueOnce({
      assignmentId: 'cpma-existing-1',
      status: 'active',
      idempotent: true
    })

    const { POST } = await import('../organizations/[organizationId]/modules/route')

    const response = await POST(
      mkRequest({
        moduleKey: 'creative_hub_globe_v1',
        source: 'manual_admin',
        effectiveFrom: '2026-05-12'
      }),
      { params: Promise.resolve({ organizationId: 'org-1' }) }
    )

    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.idempotent).toBe(true)
  })

  it('403 when admin but lacks enable capability', async () => {
    mocks.can.mockImplementation((_t: unknown, key: string) => key !== 'client_portal.module.enable')

    const { POST } = await import('../organizations/[organizationId]/modules/route')

    const response = await POST(
      mkRequest({
        moduleKey: 'creative_hub_globe_v1',
        source: 'manual_admin',
        effectiveFrom: '2026-05-12'
      }),
      { params: Promise.resolve({ organizationId: 'org-1' }) }
    )

    expect(response.status).toBe(403)
    expect(mocks.enableModule).not.toHaveBeenCalled()
  })

  it('403 when override flag set but lacks override capability', async () => {
    mocks.can.mockImplementation(
      (_t: unknown, key: string) => key !== 'client_portal.module.override_business_line_default'
    )

    const { POST } = await import('../organizations/[organizationId]/modules/route')

    const response = await POST(
      mkRequest({
        moduleKey: 'creative_hub_globe_v1',
        source: 'manual_admin',
        effectiveFrom: '2026-05-12',
        overrideBusinessLineMismatch: true,
        overrideReason: 'cliente globe en piloto wave para Q3 strategic test'
      }),
      { params: Promise.resolve({ organizationId: 'org-1' }) }
    )

    expect(response.status).toBe(403)
    expect(mocks.enableModule).not.toHaveBeenCalled()
  })

  it('400 when moduleKey missing', async () => {
    const { POST } = await import('../organizations/[organizationId]/modules/route')

    const response = await POST(
      mkRequest({ source: 'manual_admin', effectiveFrom: '2026-05-12' }),
      { params: Promise.resolve({ organizationId: 'org-1' }) }
    )

    expect(response.status).toBe(400)
  })

  it('propagates BusinessLineMismatchError as 403', async () => {
    const { BusinessLineMismatchError } = await import(
      '@/lib/client-portal/commands/errors'
    )

    mocks.enableModule.mockRejectedValueOnce(
      new BusinessLineMismatchError('mismatch test', { foo: 'bar' })
    )

    const { POST } = await import('../organizations/[organizationId]/modules/route')

    const response = await POST(
      mkRequest({
        moduleKey: 'creative_hub_globe_v1',
        source: 'manual_admin',
        effectiveFrom: '2026-05-12'
      }),
      { params: Promise.resolve({ organizationId: 'org-1' }) }
    )

    expect(response.status).toBe(403)
    const json = await response.json()

    expect(json.error).toBe('mismatch test')
    expect(json.details).toEqual({ foo: 'bar' })
  })
})

describe('PATCH /api/admin/client-portal/assignments/[id]', () => {
  it('pause: 200 OK delegates to pauseClientPortalModule', async () => {
    mocks.pauseModule.mockResolvedValueOnce({
      assignmentId: 'cpma-1',
      fromStatus: 'active',
      toStatus: 'paused',
      idempotent: false
    })

    const { PATCH } = await import('../assignments/[assignmentId]/route')

    const response = await PATCH(mkRequest({ operation: 'pause', reason: 'test' }), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(200)
    expect(mocks.pauseModule).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 'cpma-1',
        actorUserId: 'user-admin-1',
        reason: 'test'
      })
    )
  })

  it('resume: 200 OK delegates to resumeClientPortalModule', async () => {
    mocks.resumeModule.mockResolvedValueOnce({
      assignmentId: 'cpma-1',
      fromStatus: 'paused',
      toStatus: 'active',
      idempotent: false
    })

    const { PATCH } = await import('../assignments/[assignmentId]/route')

    const response = await PATCH(mkRequest({ operation: 'resume' }), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(200)
    expect(mocks.resumeModule).toHaveBeenCalled()
  })

  it('expire: 200 OK delegates to expireClientPortalModule', async () => {
    mocks.expireModule.mockResolvedValueOnce({
      assignmentId: 'cpma-1',
      fromStatus: 'active',
      toStatus: 'expired',
      effectiveTo: '2026-05-12',
      idempotent: false
    })

    const { PATCH } = await import('../assignments/[assignmentId]/route')

    const response = await PATCH(
      mkRequest({ operation: 'expire', effectiveTo: '2026-05-12' }),
      { params: Promise.resolve({ assignmentId: 'cpma-1' }) }
    )

    expect(response.status).toBe(200)
    expect(mocks.expireModule).toHaveBeenCalledWith(
      expect.objectContaining({ effectiveTo: '2026-05-12' })
    )
  })

  it('churn: requires disable capability (delete action)', async () => {
    mocks.can.mockImplementation((_t: unknown, key: string) => key !== 'client_portal.module.disable')

    const { PATCH } = await import('../assignments/[assignmentId]/route')

    const response = await PATCH(mkRequest({ operation: 'churn' }), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(403)
    expect(mocks.churnModule).not.toHaveBeenCalled()
  })

  it('400 on invalid operation', async () => {
    const { PATCH } = await import('../assignments/[assignmentId]/route')

    const response = await PATCH(mkRequest({ operation: 'foobar' }), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(400)
  })

  it('400 on missing body', async () => {
    const { PATCH } = await import('../assignments/[assignmentId]/route')

    const response = await PATCH(mkRequest(), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/admin/client-portal/assignments/[id] (churn)', () => {
  it('200 OK delegates to churnClientPortalModule', async () => {
    mocks.churnModule.mockResolvedValueOnce({
      assignmentId: 'cpma-1',
      fromStatus: 'active',
      toStatus: 'churned',
      effectiveTo: '2026-05-12',
      idempotent: false
    })

    const { DELETE } = await import('../assignments/[assignmentId]/route')

    const response = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(200)
    expect(mocks.churnModule).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: 'cpma-1', actorUserId: 'user-admin-1' })
    )
  })

  it('403 when lacks disable capability', async () => {
    mocks.can.mockReturnValue(false)

    const { DELETE } = await import('../assignments/[assignmentId]/route')

    const response = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ assignmentId: 'cpma-1' })
    })

    expect(response.status).toBe(403)
  })
})

describe('GET /api/admin/client-portal/catalog', () => {
  it('200 OK with modules listing', async () => {
    mocks.query.mockResolvedValueOnce([
      {
        module_key: 'creative_hub_globe_v1',
        display_label: 'Creative Hub Globe',
        display_label_client: 'Tu Creative Hub',
        description: null,
        applicability_scope: 'globe',
        tier: 'standard',
        view_codes: ['cliente.pulse'],
        capabilities: ['client_portal.workspace'],
        data_sources: ['agency.ico'],
        pricing_kind: 'bundled',
        effective_from: '2026-05-01',
        effective_to: null,
        created_at: '2026-05-01T10:00:00Z'
      }
    ])

    const { GET } = await import('../catalog/route')
    const response = await GET()

    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.total).toBe(1)
    expect(json.items[0]).toMatchObject({
      moduleKey: 'creative_hub_globe_v1',
      displayLabel: 'Creative Hub Globe',
      applicabilityScope: 'globe',
      tier: 'standard'
    })
  })

  it('403 when lacks catalog.manage capability', async () => {
    mocks.can.mockReturnValue(false)

    const { GET } = await import('../catalog/route')
    const response = await GET()

    expect(response.status).toBe(403)
    expect(mocks.can).toHaveBeenCalledWith(
      ADMIN_TENANT,
      'client_portal.catalog.manage',
      'read',
      'all'
    )
  })

  it('500 + captureWithDomain when query fails', async () => {
    mocks.query.mockRejectedValueOnce(new Error('PG connection refused'))

    const { GET } = await import('../catalog/route')
    const response = await GET()

    expect(response.status).toBe(500)
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'client_portal',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'api_admin_catalog_list' })
      })
    )
  })
})
