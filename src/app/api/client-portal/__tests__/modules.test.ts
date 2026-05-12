/**
 * TASK-825 Slice 4 — Integration tests for GET /api/client-portal/modules.
 *
 * Mirror exacto del shape de account-summary.test.ts (TASK-823). Covers 5
 * estados HTTP canónicos:
 *
 *   1. 401 Unauthorized when no session
 *   2. 401 when user.userId is missing (degenerate session)
 *   3. 403 Forbidden when tenantType !== 'client'
 *   4. 500 + Sentry capture when client session sin organizationId
 *   5. 200 happy path with ResolvedClientPortalModule[]
 *   6. 500 + redactErrorForResponse + Sentry when resolver throws
 */

import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetServerAuthSession = vi.fn()
const mockResolveClientPortalModulesForOrganization = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/auth', () => ({
  getServerAuthSession: () => mockGetServerAuthSession()
}))

vi.mock('@/lib/client-portal/readers/native/module-resolver', () => ({
  resolveClientPortalModulesForOrganization: (...args: unknown[]) =>
    mockResolveClientPortalModulesForOrganization(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const { GET } = await import('../modules/route')

const buildClientSession = (overrides: Record<string, unknown> = {}) => ({
  user: {
    userId: 'user-client-1',
    name: 'Cliente Demo',
    role: 'client_executive',
    tenantType: 'client' as const,
    primaryRoleCode: 'client_executive',
    businessLines: ['globe'],
    serviceModules: [],
    roleCodes: ['client_executive'],
    routeGroups: ['client'],
    authorizedViews: [],
    portalHomePath: '/home',
    organizationId: 'org-cliente-globe-1',
    clientId: 'cli-globe-1',
    ...overrides
  }
})

const buildResolvedModule = (overrides: Record<string, unknown> = {}) => ({
  assignmentId: 'cpma-test-1',
  moduleKey: 'pulse',
  status: 'active' as const,
  source: 'manual_admin' as const,
  expiresAt: null,
  displayLabel: 'Pulse (landing)',
  displayLabelClient: 'Pulse',
  applicabilityScope: 'cross',
  tier: 'standard',
  viewCodes: ['cliente.pulse', 'cliente.home'],
  capabilities: ['client_portal.pulse.read'],
  dataSources: ['agency.ico', 'commercial.engagements'],
  ...overrides
})

describe('GET /api/client-portal/modules (TASK-825)', () => {
  beforeEach(() => {
    mockGetServerAuthSession.mockReset()
    mockResolveClientPortalModulesForOrganization.mockReset()
    mockCaptureWithDomain.mockReset()
  })

  it('returns 401 Unauthorized when there is no session', async () => {
    mockGetServerAuthSession.mockResolvedValue(null)

    const response = await GET()

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mockResolveClientPortalModulesForOrganization).not.toHaveBeenCalled()
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 401 Unauthorized when session exists but user.userId is missing', async () => {
    mockGetServerAuthSession.mockResolvedValue({ user: {} })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mockResolveClientPortalModulesForOrganization).not.toHaveBeenCalled()
  })

  it('returns 403 Forbidden when the session is internal (tenantType=efeonce_internal)', async () => {
    mockGetServerAuthSession.mockResolvedValue(
      buildClientSession({ tenantType: 'efeonce_internal' as const })
    )

    const response = await GET()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Not a client session' })
    expect(mockResolveClientPortalModulesForOrganization).not.toHaveBeenCalled()
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 500 and captures to Sentry when client session lacks organizationId (callback drift)', async () => {
    mockGetServerAuthSession.mockResolvedValue(
      buildClientSession({ organizationId: undefined })
    )

    const response = await GET()

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Session incomplete' })
    expect(mockResolveClientPortalModulesForOrganization).not.toHaveBeenCalled()

    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)

    const [errArg, domainArg, optionsArg] = mockCaptureWithDomain.mock.calls[0] as [
      unknown,
      string,
      { tags?: Record<string, string>; extra?: Record<string, unknown> }
    ]

    expect(errArg).toBeInstanceOf(Error)
    expect((errArg as Error).message).toContain('organizationId')
    expect(domainArg).toBe('client_portal')
    expect(optionsArg.tags?.source).toBe('api_endpoint')
    expect(optionsArg.tags?.endpoint).toBe('modules')
    expect(optionsArg.tags?.stage).toBe('session_validation')
    expect(optionsArg.extra?.userId).toBe('user-client-1')
  })

  it('returns 200 with ResolvedClientPortalModule[] for a valid client session (happy path)', async () => {
    mockGetServerAuthSession.mockResolvedValue(buildClientSession())

    const modules = [
      buildResolvedModule(),
      buildResolvedModule({
        assignmentId: 'cpma-test-2',
        moduleKey: 'creative_hub_globe_v1',
        applicabilityScope: 'globe'
      })
    ]

    mockResolveClientPortalModulesForOrganization.mockResolvedValue(modules)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(modules)
    expect(mockResolveClientPortalModulesForOrganization).toHaveBeenCalledTimes(1)
    expect(mockResolveClientPortalModulesForOrganization).toHaveBeenCalledWith('org-cliente-globe-1')
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 200 with empty array when client has no assignments', async () => {
    mockGetServerAuthSession.mockResolvedValue(buildClientSession())
    mockResolveClientPortalModulesForOrganization.mockResolvedValue([])

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 500 + sanitized error + Sentry capture when the resolver throws', async () => {
    mockGetServerAuthSession.mockResolvedValue(buildClientSession())
    const downstreamError = new Error('PostgreSQL connection refused')

    mockResolveClientPortalModulesForOrganization.mockRejectedValue(downstreamError)

    const response = await GET()

    expect(response.status).toBe(500)
    const payload = (await response.json()) as { error: string; detail: string }

    expect(payload.error).toBe('Unable to load client portal modules')
    expect(payload.detail).toBe('PostgreSQL connection refused')

    // Payload MUST NOT leak stack trace, env vars, GCP secret URIs.
    expect(JSON.stringify(payload)).not.toMatch(/at .+\.ts:\d+/)
    expect(JSON.stringify(payload)).not.toMatch(/projects\/[^/]+\/secrets/)

    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)

    const [errArg, domainArg, optionsArg] = mockCaptureWithDomain.mock.calls[0] as [
      unknown,
      string,
      { tags?: Record<string, string>; extra?: Record<string, unknown> }
    ]

    expect(errArg).toBe(downstreamError)
    expect(domainArg).toBe('client_portal')
    expect(optionsArg.tags?.source).toBe('api_endpoint')
    expect(optionsArg.tags?.endpoint).toBe('modules')
    expect(optionsArg.extra?.organizationId).toBe('org-cliente-globe-1')
  })
})
