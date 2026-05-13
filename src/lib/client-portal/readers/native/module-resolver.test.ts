/**
 * TASK-825 Slice 4 — Unit tests for the canonical resolver.
 *
 * Covers:
 *   - Cache hit/miss + scoped invalidation per organizationId
 *   - `includePending` opt-in bypasses cache
 *   - `bypassCache` option
 *   - SQL query construction (SQL_ACTIVE_ONLY vs SQL_INCLUDING_PENDING)
 *   - Row → ResolvedClientPortalModule mapping (applicabilityScope, not businessLine)
 *   - 3 derived helpers (hasModuleAccess, hasViewCodeAccess, hasCapabilityViaModule)
 *   - Empty case (org sin assignments → [])
 *   - Error path (DB throws → captureWithDomain + re-throw)
 *
 * Mocking pattern mirror de TASK-823 account-summary.test.ts:
 *   - vi.mock('server-only')
 *   - vi.mock('@/lib/db') con mockQuery
 *   - vi.mock('@/lib/observability/capture') para verify Sentry calls
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const {
  __clearClientPortalResolverCache,
  hasCapabilityViaModule,
  hasModuleAccess,
  hasViewCodeAccess,
  resolveClientPortalModulesForOrganization
} = await import('./module-resolver')

const buildRawRow = (overrides: Record<string, unknown> = {}) => ({
  assignment_id: 'cpma-test-1',
  module_key: 'pulse',
  status: 'active',
  source: 'manual_admin',
  expires_at: null,
  display_label: 'Pulse (landing)',
  display_label_client: 'Pulse',
  applicability_scope: 'cross',
  tier: 'standard',
  view_codes: ['cliente.pulse', 'cliente.home'],
  capabilities: ['client_portal.pulse.read'],
  data_sources: ['agency.ico', 'commercial.engagements'],
  ...overrides
})

describe('resolveClientPortalModulesForOrganization — basics', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockCaptureWithDomain.mockReset()
    __clearClientPortalResolverCache()
  })

  it('returns empty array when org has no assignments', async () => {
    mockQuery.mockResolvedValue([])

    const result = await resolveClientPortalModulesForOrganization('org-empty')

    expect(result).toEqual([])
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('maps DB row to ResolvedClientPortalModule with applicabilityScope (NO businessLine)', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    const result = await resolveClientPortalModulesForOrganization('org-1')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      assignmentId: 'cpma-test-1',
      moduleKey: 'pulse',
      status: 'active',
      source: 'manual_admin',
      expiresAt: null,
      displayLabel: 'Pulse (landing)',
      displayLabelClient: 'Pulse',
      applicabilityScope: 'cross',
      tier: 'standard',
      viewCodes: ['cliente.pulse', 'cliente.home'],
      capabilities: ['client_portal.pulse.read'],
      dataSources: ['agency.ico', 'commercial.engagements']
    })

    // Anti-regression: field naming canónico V1.4 — NO businessLine
    const stringified = JSON.stringify(result[0])

    expect(stringified).not.toContain('businessLine')
    expect(stringified).toContain('applicabilityScope')
  })

  it('converts Date expires_at to ISO string', async () => {
    const futureDate = new Date('2026-12-31T23:59:59.000Z')

    mockQuery.mockResolvedValue([buildRawRow({ status: 'pilot', expires_at: futureDate })])

    const result = await resolveClientPortalModulesForOrganization('org-1')

    expect(result[0].expiresAt).toBe('2026-12-31T23:59:59.000Z')
  })

  it('uses SQL_ACTIVE_ONLY by default (NOT including pending)', async () => {
    mockQuery.mockResolvedValue([])

    await resolveClientPortalModulesForOrganization('org-1')

    const sqlArg = mockQuery.mock.calls[0]?.[0] as string

    expect(sqlArg).toContain("a.status IN ('active','pilot')")
    expect(sqlArg).not.toContain("a.status IN ('active','pilot','pending')")
  })

  it('uses SQL_INCLUDING_PENDING when includePending=true', async () => {
    mockQuery.mockResolvedValue([])

    await resolveClientPortalModulesForOrganization('org-1', { includePending: true })

    const sqlArg = mockQuery.mock.calls[0]?.[0] as string

    expect(sqlArg).toContain("a.status IN ('active','pilot','pending')")
  })
})

describe('resolveClientPortalModulesForOrganization — cache behavior', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockCaptureWithDomain.mockReset()
    __clearClientPortalResolverCache()
  })

  it('second call within TTL returns cached result (no DB re-query)', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    const first = await resolveClientPortalModulesForOrganization('org-cached')
    const second = await resolveClientPortalModulesForOrganization('org-cached')

    expect(first).toBe(second) // referential equality — same Array instance
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('bypassCache=true forces re-query even when cached', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    await resolveClientPortalModulesForOrganization('org-1')
    await resolveClientPortalModulesForOrganization('org-1', { bypassCache: true })

    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('includePending=true bypasses cache (admin UI vista distinta)', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    await resolveClientPortalModulesForOrganization('org-1')
    await resolveClientPortalModulesForOrganization('org-1', { includePending: true })

    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('includePending result is NOT cached (next default call re-fetches)', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    await resolveClientPortalModulesForOrganization('org-1', { includePending: true })
    await resolveClientPortalModulesForOrganization('org-1') // default — should refetch

    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('cache is scoped per organizationId (orgA does not affect orgB)', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    await resolveClientPortalModulesForOrganization('org-A')
    await resolveClientPortalModulesForOrganization('org-B')

    expect(mockQuery).toHaveBeenCalledTimes(2)

    // Now both should be cached
    await resolveClientPortalModulesForOrganization('org-A')
    await resolveClientPortalModulesForOrganization('org-B')

    expect(mockQuery).toHaveBeenCalledTimes(2) // still 2, both cache hits
  })

  it('__clearClientPortalResolverCache(orgId) invalidates scoped cache', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    await resolveClientPortalModulesForOrganization('org-A')
    await resolveClientPortalModulesForOrganization('org-B')

    __clearClientPortalResolverCache('org-A')

    await resolveClientPortalModulesForOrganization('org-A') // refetch
    await resolveClientPortalModulesForOrganization('org-B') // still cached

    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('__clearClientPortalResolverCache() (no arg) invalidates ALL', async () => {
    mockQuery.mockResolvedValue([buildRawRow()])

    await resolveClientPortalModulesForOrganization('org-A')
    await resolveClientPortalModulesForOrganization('org-B')

    __clearClientPortalResolverCache()

    await resolveClientPortalModulesForOrganization('org-A')
    await resolveClientPortalModulesForOrganization('org-B')

    expect(mockQuery).toHaveBeenCalledTimes(4)
  })
})

describe('resolveClientPortalModulesForOrganization — error path', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockCaptureWithDomain.mockReset()
    __clearClientPortalResolverCache()
  })

  it('captures error with canonical domain tag and re-throws', async () => {
    const dbErr = new Error('connection refused')

    mockQuery.mockRejectedValue(dbErr)

    await expect(
      resolveClientPortalModulesForOrganization('org-failing')
    ).rejects.toThrow('connection refused')

    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)

    const [errArg, domainArg, optionsArg] = mockCaptureWithDomain.mock.calls[0] as [
      unknown,
      string,
      { tags?: Record<string, string>; extra?: Record<string, unknown> }
    ]

    expect(errArg).toBe(dbErr)
    expect(domainArg).toBe('client_portal')
    expect(optionsArg.tags?.source).toBe('module_resolver')
    expect(optionsArg.extra?.organizationId).toBe('org-failing')
  })
})

describe('helpers derivados', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockCaptureWithDomain.mockReset()
    __clearClientPortalResolverCache()
    mockQuery.mockResolvedValue([
      buildRawRow({
        module_key: 'pulse',
        view_codes: ['cliente.pulse'],
        capabilities: ['client_portal.pulse.read']
      }),
      buildRawRow({
        assignment_id: 'cpma-test-2',
        module_key: 'creative_hub_globe_v1',
        view_codes: ['cliente.creative_hub', 'cliente.proyectos'],
        capabilities: ['client_portal.creative_hub.read']
      })
    ])
  })

  it('hasModuleAccess returns true for assigned module', async () => {
    expect(await hasModuleAccess('org-1', 'pulse')).toBe(true)
    expect(await hasModuleAccess('org-1', 'creative_hub_globe_v1')).toBe(true)
  })

  it('hasModuleAccess returns false for unassigned module', async () => {
    expect(await hasModuleAccess('org-1', 'roi_reports')).toBe(false)
  })

  it('hasViewCodeAccess returns true when any module exposes the view_code', async () => {
    expect(await hasViewCodeAccess('org-1', 'cliente.pulse')).toBe(true)
    expect(await hasViewCodeAccess('org-1', 'cliente.creative_hub')).toBe(true)
    expect(await hasViewCodeAccess('org-1', 'cliente.proyectos')).toBe(true)
  })

  it('hasViewCodeAccess returns false for view_code not in any assigned module', async () => {
    expect(await hasViewCodeAccess('org-1', 'cliente.web_delivery')).toBe(false)
  })

  it('hasCapabilityViaModule returns true when any module declares the capability', async () => {
    expect(await hasCapabilityViaModule('org-1', 'client_portal.pulse.read')).toBe(true)
    expect(await hasCapabilityViaModule('org-1', 'client_portal.creative_hub.read')).toBe(true)
  })

  it('hasCapabilityViaModule returns false for capability not in any assigned module', async () => {
    expect(await hasCapabilityViaModule('org-1', 'client_portal.roi.read')).toBe(false)
  })

  it('helpers benefit from cache (3 helpers + 1 direct call → 1 DB query)', async () => {
    await hasModuleAccess('org-warm', 'pulse')
    await hasViewCodeAccess('org-warm', 'cliente.pulse')
    await hasCapabilityViaModule('org-warm', 'client_portal.pulse.read')
    await resolveClientPortalModulesForOrganization('org-warm')

    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})
