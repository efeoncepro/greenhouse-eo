/**
 * TASK-823 Slice 2 — Integration tests for GET /api/client-portal/account-summary.
 *
 * Covers 5 canonical HTTP states:
 *   1. 401 Unauthorized when no session
 *   2. 403 Forbidden when tenantType !== 'client'
 *   3. 500 + Sentry capture when session client sin organizationId
 *   4. 200 happy path with snapshot payload
 *   5. 500 + redactErrorForResponse + Sentry when reader throws
 *
 * Mocking pattern mirrors `src/app/api/home/snapshot/route.test.ts`:
 * vi.mock('@/lib/auth') + vi.mock for the BFF reader + vi.mock for
 * captureWithDomain to verify Sentry domain tag.
 */

import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetServerAuthSession = vi.fn()
const mockGetOrganizationExecutiveSnapshot = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/auth', () => ({
  getServerAuthSession: () => mockGetServerAuthSession()
}))

vi.mock('@/lib/client-portal/readers/curated/account-summary', () => ({
  getOrganizationExecutiveSnapshot: (...args: unknown[]) =>
    mockGetOrganizationExecutiveSnapshot(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const { GET } = await import('../account-summary/route')

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

const buildExecutiveSnapshot = () => ({
  organizationId: 'org-cliente-globe-1',
  legalName: 'Cliente Demo SpA',
  economics: { totalRevenue: 1234567, currency: 'CLP' as const },
  projects: [],
  trend: [],
  operations: null,
  tax: null
})

describe('GET /api/client-portal/account-summary (TASK-823)', () => {
  beforeEach(() => {
    mockGetServerAuthSession.mockReset()
    mockGetOrganizationExecutiveSnapshot.mockReset()
    mockCaptureWithDomain.mockReset()
  })

  it('returns 401 Unauthorized when there is no session', async () => {
    mockGetServerAuthSession.mockResolvedValue(null)

    const response = await GET()

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mockGetOrganizationExecutiveSnapshot).not.toHaveBeenCalled()
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 401 Unauthorized when session exists but user.userId is missing', async () => {
    // Degenerate case: session shell without user resolved.
    mockGetServerAuthSession.mockResolvedValue({ user: {} })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mockGetOrganizationExecutiveSnapshot).not.toHaveBeenCalled()
  })

  it('returns 403 Forbidden when the session is internal (tenantType=efeonce_internal)', async () => {
    mockGetServerAuthSession.mockResolvedValue(
      buildClientSession({ tenantType: 'efeonce_internal' as const })
    )

    const response = await GET()

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Not a client session' })
    expect(mockGetOrganizationExecutiveSnapshot).not.toHaveBeenCalled()
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 500 and captures to Sentry when client session lacks organizationId (callback drift)', async () => {
    mockGetServerAuthSession.mockResolvedValue(
      buildClientSession({ organizationId: undefined })
    )

    const response = await GET()

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Session incomplete' })
    expect(mockGetOrganizationExecutiveSnapshot).not.toHaveBeenCalled()

    // Verify Sentry domain tag and stage are correct (anti-regression: the
    // defensive null check is the layer that detects auth callback drift).
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
    expect(optionsArg.tags?.endpoint).toBe('account_summary')
    expect(optionsArg.tags?.stage).toBe('session_validation')
    expect(optionsArg.extra?.userId).toBe('user-client-1')
  })

  it('returns 200 with the executive snapshot for a valid client session (happy path)', async () => {
    mockGetServerAuthSession.mockResolvedValue(buildClientSession())
    const snapshot = buildExecutiveSnapshot()

    mockGetOrganizationExecutiveSnapshot.mockResolvedValue(snapshot)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(snapshot)
    expect(mockGetOrganizationExecutiveSnapshot).toHaveBeenCalledTimes(1)
    expect(mockGetOrganizationExecutiveSnapshot).toHaveBeenCalledWith('org-cliente-globe-1')
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 500 + sanitized error + Sentry capture when the BFF reader throws', async () => {
    mockGetServerAuthSession.mockResolvedValue(buildClientSession())
    const downstreamError = new Error('BigQuery timeout')

    mockGetOrganizationExecutiveSnapshot.mockRejectedValue(downstreamError)

    const response = await GET()

    expect(response.status).toBe(500)
    const payload = (await response.json()) as { error: string; detail: string }

    expect(payload.error).toBe('Unable to load account summary')
    expect(payload.detail).toBe('BigQuery timeout')

    // Payload MUST NOT leak stack trace, env vars, or GCP secret URIs.
    expect(JSON.stringify(payload)).not.toMatch(/at .+\.ts:\d+/)
    expect(JSON.stringify(payload)).not.toMatch(/projects\/[^/]+\/secrets/)

    // Sentry capture invoked with canonical domain + tags.
    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)

    const [errArg, domainArg, optionsArg] = mockCaptureWithDomain.mock.calls[0] as [
      unknown,
      string,
      { tags?: Record<string, string>; extra?: Record<string, unknown> }
    ]

    expect(errArg).toBe(downstreamError)
    expect(domainArg).toBe('client_portal')
    expect(optionsArg.tags?.source).toBe('api_endpoint')
    expect(optionsArg.tags?.endpoint).toBe('account_summary')
    expect(optionsArg.extra?.organizationId).toBe('org-cliente-globe-1')
  })
})
