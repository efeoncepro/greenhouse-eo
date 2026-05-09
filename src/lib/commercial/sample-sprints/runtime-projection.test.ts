import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/commercial-cost-attribution/v2-reader', () => ({
  readCommercialCostAttributionByServiceForPeriodV2: vi.fn()
}))

vi.mock('./team-enrichment', () => ({
  enrichProposedTeam: vi.fn()
}))

vi.mock('./capacity-risk', () => ({
  resolveCapacityRiskForSprint: vi.fn()
}))

vi.mock('./store', () => ({
  listSampleSprints: vi.fn(),
  getSampleSprintDetail: vi.fn()
}))

vi.mock('./health', () => ({
  countCommercialEngagementBudgetOverrun: vi.fn(),
  countCommercialEngagementOverdueDecision: vi.fn(),
  countCommercialEngagementStaleProgress: vi.fn(),
  countCommercialEngagementUnapprovedActive: vi.fn(),
  countCommercialEngagementZombie: vi.fn(),
  getCommercialEngagementConversionRateSnapshot: vi.fn(),
  resolveCommercialEngagementConversionRateThreshold: vi.fn(() => 0.35)
}))

import { readCommercialCostAttributionByServiceForPeriodV2 } from '@/lib/commercial-cost-attribution/v2-reader'

import { resolveCapacityRiskForSprint } from './capacity-risk'
import { getSampleSprintDetail, listSampleSprints } from './store'
import { enrichProposedTeam } from './team-enrichment'

import {
  __clearAllProjectionCache,
  __getProjectionCacheSize,
  __resetDegradationCounterForTests,
  clearProjectionCacheForService,
  clearProjectionCacheForSubject,
  getRecentProjectionDegradationCount,
  resolveSampleSprintRuntimeProjection
} from './runtime-projection'

const mockedListSampleSprints = listSampleSprints as unknown as ReturnType<typeof vi.fn>
const mockedGetSampleSprintDetail = getSampleSprintDetail as unknown as ReturnType<typeof vi.fn>

const mockedReadCostAttribution =
  readCommercialCostAttributionByServiceForPeriodV2 as unknown as ReturnType<typeof vi.fn>

const mockedEnrichProposedTeam = enrichProposedTeam as unknown as ReturnType<typeof vi.fn>
const mockedResolveCapacityRisk = resolveCapacityRiskForSprint as unknown as ReturnType<typeof vi.fn>

import type { TenantContext } from '@/lib/tenant/get-tenant-context'

const buildTenant = (overrides: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'user-julio',
  clientId: 'client-efeonce',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['internal', 'admin'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  role: 'efeonce_admin',
  projectIds: [],
  featureFlags: [],
  timezone: 'America/Santiago',
  portalHomePath: '/dashboard',
  authMode: 'sso',
  preferredLocale: 'es-CL',
  tenantDefaultLocale: 'es-CL',
  legacyLocale: 'es-CL',
  effectiveLocale: 'es-CL',
  ...overrides
})

const buildItem = (overrides: Partial<Parameters<typeof Object.assign>[0]> = {}) => ({
  serviceId: 'svc-001',
  publicId: 'PILOT-001',
  name: 'Sky Airline pilot',
  engagementKind: 'pilot' as const,
  status: 'pending_approval',
  pipelineStage: 'pilot',
  spaceId: 'space-001',
  spaceName: 'Sky Airline',
  clientId: 'client-001',
  clientName: 'Sky Airline',
  organizationId: 'org-001',
  organizationName: 'Sky Airline SA',
  startDate: '2026-05-01',
  targetEndDate: '2026-05-30',
  expectedInternalCostClp: 4_000_000,
  decisionDeadline: '2026-05-29',
  approvalStatus: 'pending',
  latestSnapshotDate: null,
  outcomeKind: null,
  createdAt: '2026-04-30T12:00:00.000Z',
  ...overrides
})

describe('runtime-projection — Slice 1 skeleton', () => {
  beforeEach(() => {
    __clearAllProjectionCache()
    __resetDegradationCounterForTests()
    vi.clearAllMocks()
    mockedReadCostAttribution.mockResolvedValue(new Map<string, number>())
    mockedEnrichProposedTeam.mockResolvedValue({ team: [], hasUnresolvedMembers: false })
    mockedResolveCapacityRisk.mockResolvedValue({ capacityRisk: null, allLookupsFailed: false })
  })

  it('proyecta items con shape canónico cuando todas las fuentes resuelven OK', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-A' }), buildItem({ serviceId: 'svc-B' })])

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.contractVersion).toBe('sample-sprint-runtime.v1')
    expect(projection.items).toHaveLength(2)
    expect(projection.items[0]!.serviceId).toBe('svc-A')
    expect(projection.items[0]!.actualClp).toBeNull() // sin coste real para el período
    expect(projection.items[0]!.progressPct).toBeNull() // listItem sin metrics_json → null honest
    expect(projection.items[0]!.budgetUsagePct).toBeNull() // null cuando actualClp=null
    expect(projection.degraded).toEqual([]) // no errors with passthrough resolvers
    expect(projection.selected).toBeNull()
  })

  it('popula actualClp y budgetUsagePct cuando el reader cost attribution devuelve valor', async () => {
    mockedListSampleSprints.mockResolvedValue([
      buildItem({ serviceId: 'svc-A', expectedInternalCostClp: 4_000_000 })
    ])
    mockedReadCostAttribution.mockResolvedValue(new Map([['svc-A', 1_200_000]]))

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.items[0]!.actualClp).toBe(1_200_000)
    expect(projection.items[0]!.budgetUsagePct).toBe(30) // 1.2M / 4M * 100 = 30%
  })

  it('marca degraded cost_attribution_unavailable cuando el reader falla', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem()])
    mockedReadCostAttribution.mockRejectedValue(new Error('PG view down'))

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.items[0]!.actualClp).toBeNull()
    expect(projection.degraded.some(reason => reason.code === 'cost_attribution_unavailable')).toBe(true)
    expect(getRecentProjectionDegradationCount()).toBeGreaterThan(0)
  })

  it('marca progressPct=100 cuando outcomeKind terminal en el listItem', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-A', outcomeKind: 'converted' })])

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.items[0]!.progressPct).toBe(100)
  })

  it('deriva signalSeverity=warning para activo con snapshot stale > 10 días', async () => {
    const oldDate = new Date(Date.now() - 15 * 86_400_000).toISOString()

    mockedListSampleSprints.mockResolvedValue([
      buildItem({ serviceId: 'svc-A', status: 'active', latestSnapshotDate: oldDate })
    ])

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.items[0]!.signalSeverity).toBe('warning')
    expect(projection.items[0]!.daysSinceLastSnapshot).toBeGreaterThanOrEqual(15)
  })

  it('deriva signalSeverity=success para outcome converted', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ outcomeKind: 'converted', status: 'closed' })])

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.items[0]!.signalSeverity).toBe('success')
  })

  it('cachea el resultado por (subjectId, tenantId) y reusa en re-llamadas dentro del TTL', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem()])
    const tenant = buildTenant()

    expect(__getProjectionCacheSize()).toBe(0)

    await resolveSampleSprintRuntimeProjection({ tenant })

    expect(__getProjectionCacheSize()).toBe(1)
    expect(mockedListSampleSprints).toHaveBeenCalledTimes(1)

    // Segunda llamada — cache hit, NO debe consultar store de nuevo.
    await resolveSampleSprintRuntimeProjection({ tenant })
    expect(mockedListSampleSprints).toHaveBeenCalledTimes(1)
  })

  it('clearProjectionCacheForService droppea entries que mencionan el serviceId', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-X' }), buildItem({ serviceId: 'svc-Y' })])

    await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(__getProjectionCacheSize()).toBe(1)

    const cleared = clearProjectionCacheForService('svc-X')

    expect(cleared).toBe(1)
    expect(__getProjectionCacheSize()).toBe(0)
  })

  it('clearProjectionCacheForService es idempotente cuando no hay entries que mencionen el serviceId', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-A' })])

    await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    const cleared = clearProjectionCacheForService('svc-DOES-NOT-EXIST')

    expect(cleared).toBe(0)
    expect(__getProjectionCacheSize()).toBe(1)
  })

  it('clearProjectionCacheForSubject droppea todas las entries del subject', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem()])

    await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })
    expect(__getProjectionCacheSize()).toBe(1)

    const cleared = clearProjectionCacheForSubject('user-julio')

    expect(cleared).toBe(1)
    expect(__getProjectionCacheSize()).toBe(0)
  })

  it('cuando store list falla, retorna projection empty + degraded honest sin throw', async () => {
    mockedListSampleSprints.mockRejectedValue(new Error('PG down'))

    const projection = await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })

    expect(projection.items).toEqual([])
    expect(projection.degraded).toHaveLength(1)
    expect(projection.degraded[0]!.severity).toBe('error')
    expect(getRecentProjectionDegradationCount()).toBe(1)
  })

  it('cuando hay selectedServiceId, fetchea detalle y popula selected con team enrichment', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-001' })])
    mockedGetSampleSprintDetail.mockResolvedValue({
      ...buildItem({ serviceId: 'svc-001' }),
      successCriteria: {},
      proposedTeam: [{ memberId: 'mem-1', proposedFte: 0.5, role: 'Lead' }],
      approval: null,
      latestSnapshots: [],
      outcome: null,
      auditEvents: []
    })
    mockedEnrichProposedTeam.mockResolvedValue({
      team: [{
        memberId: 'mem-1',
        displayName: 'Daniela España',
        roleTitle: 'Tech Lead',
        proposedFte: 0.5,
        commitmentRole: 'Lead',
        unresolved: false
      }],
      hasUnresolvedMembers: false
    })

    const projection = await resolveSampleSprintRuntimeProjection({
      tenant: buildTenant(),
      selectedServiceId: 'svc-001'
    })

    expect(projection.selected).not.toBeNull()
    expect(projection.selected!.serviceId).toBe('svc-001')
    expect(projection.selected!.team).toHaveLength(1)
    expect(projection.selected!.team[0]!.displayName).toBe('Daniela España')
    expect(projection.selected!.team[0]!.unresolved).toBe(false)
    // Sin snapshots ni outcome → degraded progress_snapshot_missing
    expect(projection.degraded.some(reason => reason.code === 'progress_snapshot_missing')).toBe(true)
  })

  it('eleva degraded team_enrichment_failed cuando hay miembros unresolved', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-001' })])
    mockedGetSampleSprintDetail.mockResolvedValue({
      ...buildItem({ serviceId: 'svc-001' }),
      successCriteria: {},
      proposedTeam: [{ memberId: 'mem-stale', proposedFte: 0.5, role: null }],
      approval: null,
      latestSnapshots: [],
      outcome: null,
      auditEvents: []
    })
    mockedEnrichProposedTeam.mockResolvedValue({
      team: [{
        memberId: 'mem-stale',
        displayName: null,
        roleTitle: null,
        proposedFte: 0.5,
        commitmentRole: null,
        unresolved: true
      }],
      hasUnresolvedMembers: true
    })

    const projection = await resolveSampleSprintRuntimeProjection({
      tenant: buildTenant(),
      selectedServiceId: 'svc-001'
    })

    expect(projection.degraded.some(reason => reason.code === 'team_enrichment_failed')).toBe(true)
    expect(projection.degraded.find(reason => reason.code === 'team_enrichment_failed')?.severity).toBe('warning')
  })

  it('popula capacityRisk en selected cuando el evaluator devuelve datos', async () => {
    mockedListSampleSprints.mockResolvedValue([buildItem({ serviceId: 'svc-001' })])
    mockedGetSampleSprintDetail.mockResolvedValue({
      ...buildItem({ serviceId: 'svc-001' }),
      successCriteria: {},
      proposedTeam: [{ memberId: 'mem-1', proposedFte: 0.6, role: null }],
      approval: null,
      latestSnapshots: [],
      outcome: null,
      auditEvents: []
    })
    mockedEnrichProposedTeam.mockResolvedValue({
      team: [{
        memberId: 'mem-1',
        displayName: 'A',
        roleTitle: null,
        proposedFte: 0.6,
        commitmentRole: null,
        unresolved: false
      }],
      hasUnresolvedMembers: false
    })
    mockedResolveCapacityRisk.mockResolvedValue({
      capacityRisk: {
        severity: 'critical',
        overcommittedMemberIds: ['mem-1'],
        summary: '1 miembro sobre asignado'
      },
      allLookupsFailed: false
    })

    const projection = await resolveSampleSprintRuntimeProjection({
      tenant: buildTenant(),
      selectedServiceId: 'svc-001'
    })

    expect(projection.selected!.capacityRisk?.severity).toBe('critical')
    expect(projection.selected!.hasCapacityRisk).toBe(true)
  })
})

describe('runtime-projection — degradation counter', () => {
  beforeEach(() => {
    __clearAllProjectionCache()
    __resetDegradationCounterForTests()
  })

  it('cuenta degradaciones con severity=error en la ventana de 5 minutos', async () => {
    mockedListSampleSprints.mockRejectedValue(new Error('boom'))

    expect(getRecentProjectionDegradationCount()).toBe(0)

    await resolveSampleSprintRuntimeProjection({ tenant: buildTenant() })
    await resolveSampleSprintRuntimeProjection({ tenant: { ...buildTenant(), userId: 'user-other' } })

    expect(getRecentProjectionDegradationCount()).toBe(2)
  })
})
