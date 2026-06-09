import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

vi.mock('server-only', () => ({}))

const mockResolveOrganizationWorkspaceProjection = vi.fn()
const mockGetOrganizationDetail = vi.fn()
const mockGetOrganizationFinanceSummary = vi.fn()
const mockGetOrganizationProjects = vi.fn()
const mockGetAccountComplete360 = vi.fn()
const mockGetActiveCaseForOrganization = vi.fn()
const mockIsClientLifecycleOnboardingEnabled = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('./projection', () => ({
  resolveOrganizationWorkspaceProjection: (...args: unknown[]) => mockResolveOrganizationWorkspaceProjection(...args)
}))

vi.mock('@/lib/account-360/organization-store', () => ({
  getOrganizationDetail: (...args: unknown[]) => mockGetOrganizationDetail(...args),
  getOrganizationFinanceSummary: (...args: unknown[]) => mockGetOrganizationFinanceSummary(...args)
}))

vi.mock('@/lib/account-360/organization-projects', () => ({
  getOrganizationProjects: (...args: unknown[]) => mockGetOrganizationProjects(...args)
}))

vi.mock('@/lib/account-360/account-complete-360', () => ({
  getAccountComplete360: (...args: unknown[]) => mockGetAccountComplete360(...args)
}))

vi.mock('@/lib/client-lifecycle/store', () => ({
  getActiveCaseForOrganization: (...args: unknown[]) => mockGetActiveCaseForOrganization(...args)
}))

vi.mock('@/lib/client-lifecycle/flags', () => ({
  isClientLifecycleOnboardingEnabled: (...args: unknown[]) => mockIsClientLifecycleOnboardingEnabled(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const {
  OrganizationWorkspaceCompactSignalsNotFoundError,
  readOrganizationWorkspaceCompactSignals
} = await import('./compact-signals')

const subject: TenantEntitlementSubject = {
  userId: 'user-1',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['agency', 'finance'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/agency'
}

const projection = {
  organizationId: 'org-1',
  entrypointContext: 'agency',
  relationship: { kind: 'internal_operator', subjectUserId: 'user-1', organizationId: 'org-1' },
  visibleFacets: ['identity', 'delivery', 'finance', 'services', 'staffAug'],
  visibleTabs: [],
  defaultFacet: 'identity',
  allowedActions: [],
  fieldRedactions: {},
  degradedMode: false,
  degradedReason: null,
  cacheKey: 'user-1:org-1:agency',
  computedAt: new Date('2026-06-09T12:00:00.000Z')
}

const detail = {
  organizationId: 'org-1',
  organizationName: 'Acme',
  legalName: 'Acme SpA',
  taxId: '76.000.000-0',
  logoUrl: 'https://example.com/logo.png',
  updatedAt: '2026-06-09T12:01:00.000Z'
}

const account360 = {
  _meta: {
    errors: [],
    warnings: [],
    facetsResolved: ['identity', 'delivery', 'finance', 'services', 'staffAug'],
    facetsRequested: ['identity', 'delivery', 'finance', 'services', 'staffAug'],
    resolvedAt: '2026-06-09T12:02:00.000Z',
    cacheStatus: {},
    resolverVersion: 'test',
    totalMs: 12
  },
  identity: {},
  finance: {
    invoiceCount: 4,
    outstandingAmount: 0,
    revenueYTD: 1000,
    dteCoverage: { coveredPct: 100, uncoveredCount: 0 }
  },
  services: { totalActiveCount: 2 },
  staffAug: { activePlacementCount: 1 },
  delivery: {
    icoMetrics: { otdPct: 95, ftrPct: 91, throughputCount: 8, stuckAssetCount: 0 },
    projectCount: 2,
    activeProjectCount: 1,
    sprintCount: 1,
    taskCounts: {
      total: 20,
      completed: 15,
      active: 5,
      overdue: 0,
      carryOver: 0
    }
  }
}

describe('readOrganizationWorkspaceCompactSignals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveOrganizationWorkspaceProjection.mockResolvedValue(projection)
    mockGetOrganizationDetail.mockResolvedValue(detail)
    mockGetAccountComplete360.mockResolvedValue(account360)
    mockGetOrganizationProjects.mockResolvedValue({
      organizationId: 'org-1',
      spaces: [],
      totals: {
        totalProjects: 2,
        activeProjects: 1,
        totalTasks: 20,
        activeTasks: 5,
        completedTasks: 15,
        avgRpa: 82,
        overallHealth: 'green'
      }
    })
    mockGetOrganizationFinanceSummary.mockResolvedValue({
      organizationId: 'org-1',
      year: 2026,
      month: 6,
      clientCount: 1,
      totalRevenueClp: 1000,
      totalOutstandingClp: 0
    })
    mockIsClientLifecycleOnboardingEnabled.mockReturnValue(true)
    mockGetActiveCaseForOrganization.mockResolvedValue(null)
  })

  it('builds a ready compact projection from authorized facets', async () => {
    const result = await readOrganizationWorkspaceCompactSignals({
      subject,
      organizationId: 'org-1',
      entrypointContext: 'agency',
      asOf: '2026-06-09',
      periodYear: 2026,
      periodMonth: 6
    })

    expect(result.status).toBe('ready')
    expect(result.projection.visibleFacets).toContain('finance')
    expect(result.readiness.some(item => item.id === 'finance.profile' && item.state === 'complete')).toBe(true)
    expect(result.health.overallState).toBe('good')
    expect(result.degradedSources).toEqual([])
    expect(mockGetAccountComplete360).toHaveBeenCalledWith('org-1', expect.objectContaining({
      facets: projection.visibleFacets,
      requesterRoleCodes: subject.roleCodes,
      requesterTenantType: subject.tenantType
    }))
  })

  it('returns a partial payload when an optional source degrades', async () => {
    mockGetOrganizationProjects.mockRejectedValue(new Error('projects unavailable'))

    const result = await readOrganizationWorkspaceCompactSignals({
      subject,
      organizationId: 'org-1',
      entrypointContext: 'agency'
    })

    expect(result.status).toBe('partial')
    expect(result.degradedSources.some(source => source.source === 'projects')).toBe(true)
    expect(result.provenance.find(item => item.source === 'projects')?.status).toBe('degraded')
  })

  it('returns unavailable when projection authorizes no facets', async () => {
    mockResolveOrganizationWorkspaceProjection.mockResolvedValue({
      ...projection,
      visibleFacets: [],
      defaultFacet: null
    })

    const result = await readOrganizationWorkspaceCompactSignals({
      subject,
      organizationId: 'org-1',
      entrypointContext: 'agency'
    })

    expect(result.status).toBe('unavailable')
    expect(result.projection.visibleFacets).toEqual([])
    expect(mockGetAccountComplete360).not.toHaveBeenCalled()
  })

  it('throws not found when the organization detail source returns empty', async () => {
    mockGetOrganizationDetail.mockResolvedValue(null)

    await expect(readOrganizationWorkspaceCompactSignals({
      subject,
      organizationId: 'org-missing',
      entrypointContext: 'agency'
    })).rejects.toBeInstanceOf(OrganizationWorkspaceCompactSignalsNotFoundError)
  })
})
