import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireAdminTenantContext = vi.fn()
const mockHasEntitlement = vi.fn()
const mockRunGreenhousePostgresQuery = vi.fn()
const mockSyncServicesForCompany = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: (...args: unknown[]) => mockRequireAdminTenantContext(...args)
}))

vi.mock('@/lib/entitlements/runtime', () => ({
  hasEntitlement: (...args: unknown[]) => mockHasEntitlement(...args)
}))

vi.mock('@/lib/commercial/party/route-entitlement-subject', () => ({
  buildTenantEntitlementSubject: (tenant: unknown) => tenant
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/services/service-sync', () => ({
  syncServicesForCompany: (...args: unknown[]) => mockSyncServicesForCompany(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (error: unknown) => error instanceof Error ? error.message : 'Unknown error'
}))

import { GET, POST } from './route'

describe('/api/admin/integrations/hubspot/orphan-services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminTenantContext.mockResolvedValue({
      tenant: { userId: 'usr-1', roleCodes: ['efeonce_admin'] },
      errorResponse: null
    })
    mockHasEntitlement.mockReturnValue(true)
    mockRunGreenhousePostgresQuery.mockResolvedValue([
      {
        webhook_inbox_event_id: 'evt-1',
        received_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        error_message: 'organization_unresolved:svc-1:12345',
        payload_json: {}
      }
    ])
    mockSyncServicesForCompany.mockResolvedValue({
      hubspotCompanyId: '12345',
      created: 1,
      updated: 2,
      skipped: 0,
      errors: [],
      spaceAutoCreated: true
    })
  })

  it('lists orphan services for callers with resolve_orphan capability', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockHasEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'usr-1' }),
      'commercial.service_engagement.resolve_orphan',
      'approve'
    )
    expect(body.total).toBe(1)
    expect(body.stale).toBe(1)
    expect(body.items[0]).toEqual(expect.objectContaining({
      hubspotServiceId: 'svc-1',
      hubspotCompanyId: '12345',
      reason: 'no_greenhouse_space'
    }))
  })

  it('rejects callers without resolve_orphan capability', async () => {
    mockHasEntitlement.mockReturnValue(false)

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('retries a single HubSpot company with explicit auto-space source', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/integrations/hubspot/orphan-services', {
        method: 'POST',
        body: JSON.stringify({ hubspotCompanyId: '12345' })
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockSyncServicesForCompany).toHaveBeenCalledWith('12345', {
      createMissingSpace: true,
      createdBySource: 'admin:hubspot-orphan-services'
    })
    expect(body).toEqual(expect.objectContaining({
      hubspotCompanyId: '12345',
      created: 1,
      updated: 2,
      spaceAutoCreated: true
    }))
  })

  it('validates retry body', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/integrations/hubspot/orphan-services', {
        method: 'POST',
        body: JSON.stringify({})
      })
    )

    expect(response.status).toBe(400)
    expect(mockSyncServicesForCompany).not.toHaveBeenCalled()
  })
})
