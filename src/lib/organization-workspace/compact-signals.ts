import 'server-only'

import { getAccountComplete360 } from '@/lib/account-360/account-complete-360'
import { getOrganizationDetail, getOrganizationFinanceSummary } from '@/lib/account-360/organization-store'
import { getOrganizationProjects } from '@/lib/account-360/organization-projects'
import { getActiveCaseForOrganization } from '@/lib/client-lifecycle/store'
import { isClientLifecycleOnboardingEnabled } from '@/lib/client-lifecycle/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { isSourceDegraded, withSourceTimeout, type SourceResult } from '@/lib/platform-health/with-source-timeout'
import type { AccountFacetName } from '@/types/account-complete-360'

import { resolveOrganizationWorkspaceProjection } from './projection'
import {
  buildCompactHealth,
  buildCompactNextActions,
  buildCompactReadiness,
  buildCompactRecentSignals
} from './compact-signals-mappers'
import type {
  CompactSignalDegradedSource,
  CompactSignalProvenance,
  OrganizationWorkspaceCompactSignalSource,
  OrganizationWorkspaceCompactSignalSourceValues,
  OrganizationWorkspaceCompactSignals,
  OrganizationWorkspaceCompactSignalsInput,
  OrganizationWorkspaceCompactSignalsStatus
} from './compact-signals-types'
import type { OrganizationWorkspaceProjection } from './projection-types'

const DEFAULT_SOURCE_TIMEOUT_MS = 3_000

export class OrganizationWorkspaceCompactSignalsNotFoundError extends Error {
  constructor(public readonly organizationId: string) {
    super(`Organization '${organizationId}' was not found.`)
    this.name = 'OrganizationWorkspaceCompactSignalsNotFoundError'
  }
}

const currentPeriod = () => {
  const now = new Date()

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  }
}

const toDateOnly = (value: string | null | undefined): string => {
  if (value) return value.slice(0, 10)

  return new Date().toISOString().slice(0, 10)
}

const sourceResultToDegraded = (
  result: SourceResult<unknown>
): CompactSignalDegradedSource | null => {
  if (!isSourceDegraded(result)) return null

  return {
    source: result.source as OrganizationWorkspaceCompactSignalSource,
    status: result.status as CompactSignalDegradedSource['status'],
    observedAt: result.observedAt,
    durationMs: result.durationMs,
    error: result.error
  }
}

const resultStatus = <T>(result: SourceResult<T> | null | undefined): CompactSignalProvenance['status'] => {
  if (!result) return 'skipped'

  return isSourceDegraded(result) ? 'degraded' : 'available'
}

const resultObservedAt = <T>(result: SourceResult<T> | null | undefined): string | null =>
  result?.observedAt ?? null

const buildUnavailablePayload = ({
  organizationId,
  entrypointContext,
  asOf,
  period,
  projection,
  degradedSources,
  provenance,
  sourceFreshness
}: {
  organizationId: string
  entrypointContext: OrganizationWorkspaceCompactSignalsInput['entrypointContext']
  asOf: string
  period: { year: number; month: number }
  projection: OrganizationWorkspaceProjection
  degradedSources: CompactSignalDegradedSource[]
  provenance: CompactSignalProvenance[]
  sourceFreshness: OrganizationWorkspaceCompactSignals['sourceFreshness']
}): OrganizationWorkspaceCompactSignals => ({
  organizationId,
  entrypointContext,
  status: 'unavailable',
  computedAt: new Date().toISOString(),
  asOf,
  period,
  projection: {
    visibleFacets: projection.visibleFacets,
    defaultFacet: projection.defaultFacet,
    degradedMode: projection.degradedMode,
    degradedReason: projection.degradedReason
  },
  health: {
    overallState: 'unknown',
    score: null,
    drivers: []
  },
  readiness: [],
  recentSignals: [],
  nextActions: [],
  provenance,
  degradedSources,
  sourceFreshness
})

const buildProvenance = ({
  projectionResult,
  detailResult,
  account360Result,
  projectsResult,
  financeResult,
  lifecycleResult
}: {
  projectionResult: SourceResult<OrganizationWorkspaceProjection> | null
  detailResult: SourceResult<OrganizationWorkspaceCompactSignalSourceValues['detail']> | null
  account360Result: SourceResult<OrganizationWorkspaceCompactSignalSourceValues['account360']> | null
  projectsResult: SourceResult<OrganizationWorkspaceCompactSignalSourceValues['projects']> | null
  financeResult: SourceResult<OrganizationWorkspaceCompactSignalSourceValues['financeSummary']> | null
  lifecycleResult: SourceResult<OrganizationWorkspaceCompactSignalSourceValues['lifecycleCase']> | null
}): CompactSignalProvenance[] => [
  {
    source: 'workspace_projection',
    label: 'Workspace projection',
    status: resultStatus(projectionResult),
    observedAt: resultObservedAt(projectionResult),
    confidence: projectionResult?.status === 'ok' ? 'high' : 'low'
  },
  {
    source: 'organization_360',
    label: 'Organization 360',
    status: resultStatus(detailResult),
    observedAt: resultObservedAt(detailResult),
    confidence: detailResult?.status === 'ok' ? 'high' : 'low'
  },
  {
    source: 'account_360',
    label: 'Account 360',
    status: resultStatus(account360Result),
    observedAt: resultObservedAt(account360Result),
    confidence: account360Result?.status === 'ok' ? 'high' : 'low'
  },
  {
    source: 'projects',
    label: 'Projects',
    status: resultStatus(projectsResult),
    observedAt: resultObservedAt(projectsResult),
    confidence: projectsResult?.status === 'ok' ? 'medium' : projectsResult ? 'low' : 'medium'
  },
  {
    source: 'finance_summary',
    label: 'Finance summary',
    status: resultStatus(financeResult),
    observedAt: resultObservedAt(financeResult),
    confidence: financeResult?.status === 'ok' ? 'medium' : financeResult ? 'low' : 'medium'
  },
  {
    source: 'client_lifecycle',
    label: 'Client lifecycle',
    status: resultStatus(lifecycleResult),
    observedAt: resultObservedAt(lifecycleResult),
    confidence: lifecycleResult?.status === 'ok' ? 'medium' : lifecycleResult ? 'low' : 'medium'
  },
  {
    source: 'reliability_signals',
    label: 'Reliability signals',
    status: 'skipped',
    observedAt: null,
    confidence: 'low'
  }
]

export const readOrganizationWorkspaceCompactSignals = async (
  input: OrganizationWorkspaceCompactSignalsInput
): Promise<OrganizationWorkspaceCompactSignals> => {
  const periodDefaults = currentPeriod()

  const period = {
    year: input.periodYear ?? periodDefaults.year,
    month: input.periodMonth ?? periodDefaults.month
  }

  const asOf = toDateOnly(input.asOf)
  const accountLimit = input.limits?.account360 ?? 20

  const projectionResult = await withSourceTimeout(
    () => resolveOrganizationWorkspaceProjection({
      subject: input.subject,
      organizationId: input.organizationId,
      entrypointContext: input.entrypointContext
    }),
    { source: 'workspace_projection', timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS }
  )

  const detailResult = await withSourceTimeout(
    () => getOrganizationDetail(input.organizationId),
    { source: 'organization_360', timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS }
  )

  if (detailResult.status === 'ok' && !detailResult.value) {
    throw new OrganizationWorkspaceCompactSignalsNotFoundError(input.organizationId)
  }

  const projection = projectionResult.value

  const degradedSources = [projectionResult, detailResult]
    .map(sourceResultToDegraded)
    .filter((source): source is CompactSignalDegradedSource => Boolean(source))

  const sourceFreshness: OrganizationWorkspaceCompactSignals['sourceFreshness'] = {
    workspace_projection: projection?.computedAt.toISOString() ?? projectionResult.observedAt ?? null,
    organization_360: detailResult.value?.updatedAt ?? detailResult.observedAt ?? null,
    account_360: null,
    projects: null,
    finance_summary: null,
    client_lifecycle: null,
    reliability_signals: null
  }

  if (!projection || projection.degradedMode || projection.visibleFacets.length === 0) {
    const unavailableProjection: OrganizationWorkspaceProjection = projection ?? {
      organizationId: input.organizationId,
      entrypointContext: input.entrypointContext,
      relationship: { kind: 'no_relation', subjectUserId: input.subject.userId, organizationId: input.organizationId },
      visibleFacets: [],
      visibleTabs: [],
      defaultFacet: null,
      allowedActions: [],
      fieldRedactions: {},
      degradedMode: true,
      degradedReason: projectionResult.status === 'ok' ? 'no_facets_authorized' : 'relationship_lookup_failed',
      cacheKey: `${input.subject.userId}:${input.organizationId}:${input.entrypointContext}`,
      computedAt: new Date()
    }

    return buildUnavailablePayload({
      organizationId: input.organizationId,
      entrypointContext: input.entrypointContext,
      asOf,
      period,
      projection: unavailableProjection,
      degradedSources,
      provenance: buildProvenance({
        projectionResult,
        detailResult,
        account360Result: null,
        projectsResult: null,
        financeResult: null,
        lifecycleResult: null
      }),
      sourceFreshness
    })
  }

  const requestedFacets = projection.visibleFacets as AccountFacetName[]
  const shouldFetchProjects = projection.visibleFacets.includes('delivery')
  const shouldFetchFinance = projection.visibleFacets.includes('finance') || projection.visibleFacets.includes('economics')
  const shouldFetchLifecycle = isClientLifecycleOnboardingEnabled()

  const [account360Result, projectsResult, financeResult, lifecycleResult] = await Promise.all([
    withSourceTimeout(
      () => getAccountComplete360(input.organizationId, {
        facets: requestedFacets,
        asOf,
        limit: accountLimit,
        requesterRoleCodes: input.subject.roleCodes,
        requesterTenantType: input.subject.tenantType,
        requesterOrganizationId: null
      }),
      { source: 'account_360', timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS }
    ),
    shouldFetchProjects
      ? withSourceTimeout(() => getOrganizationProjects(input.organizationId), {
        source: 'projects',
        timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS
      })
      : Promise.resolve(null),
    shouldFetchFinance
      ? withSourceTimeout(() => getOrganizationFinanceSummary(input.organizationId, period.year, period.month), {
        source: 'finance_summary',
        timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS
      })
      : Promise.resolve(null),
    shouldFetchLifecycle
      ? withSourceTimeout(() => getActiveCaseForOrganization(input.organizationId, 'onboarding'), {
        source: 'client_lifecycle',
        timeoutMs: DEFAULT_SOURCE_TIMEOUT_MS
      })
      : Promise.resolve(null)
  ])

  for (const result of [account360Result, projectsResult, financeResult, lifecycleResult]) {
    if (result) {
      const degraded = sourceResultToDegraded(result)

      if (degraded) degradedSources.push(degraded)
    }
  }

  sourceFreshness.account_360 = account360Result?.value?._meta.resolvedAt ?? account360Result?.observedAt ?? null
  sourceFreshness.projects = projectsResult?.observedAt ?? null
  sourceFreshness.finance_summary = financeResult?.observedAt ?? null
  sourceFreshness.client_lifecycle = lifecycleResult?.value?.updatedAt ?? lifecycleResult?.observedAt ?? null

  const values: OrganizationWorkspaceCompactSignalSourceValues = {
    projection,
    detail: detailResult.value ?? null,
    account360: account360Result.value ?? null,
    projects: projectsResult?.value ?? null,
    financeSummary: financeResult?.value ?? null,
    lifecycleCase: lifecycleResult?.value ?? null
  }

  let readiness = buildCompactReadiness(values)
  const health = buildCompactHealth(values, readiness)
  const recentSignals = buildCompactRecentSignals(values, input.limits?.recentSignals)
  const nextActions = buildCompactNextActions(values, input.limits?.nextActions)

  const hasAnyData = Boolean(
    values.detail ||
    values.account360 ||
    values.projects ||
    values.financeSummary ||
    values.lifecycleCase ||
    readiness.length > 0 ||
    recentSignals.length > 0 ||
    nextActions.length > 0
  )

  if (!hasAnyData) readiness = []

  const status: OrganizationWorkspaceCompactSignalsStatus = degradedSources.length > 0
    ? 'partial'
    : hasAnyData
      ? 'ready'
      : 'empty'

  return {
    organizationId: projection.organizationId,
    entrypointContext: input.entrypointContext,
    status,
    computedAt: new Date().toISOString(),
    asOf,
    period,
    projection: {
      visibleFacets: projection.visibleFacets,
      defaultFacet: projection.defaultFacet,
      degradedMode: projection.degradedMode,
      degradedReason: projection.degradedReason
    },
    health,
    readiness,
    recentSignals,
    nextActions,
    provenance: buildProvenance({
      projectionResult,
      detailResult,
      account360Result,
      projectsResult,
      financeResult,
      lifecycleResult
    }),
    degradedSources,
    sourceFreshness
  }
}

export const readOrganizationWorkspaceCompactSignalsSafely = async (
  input: OrganizationWorkspaceCompactSignalsInput
): Promise<OrganizationWorkspaceCompactSignals> => {
  try {
    return await readOrganizationWorkspaceCompactSignals(input)
  } catch (error) {
    if (error instanceof OrganizationWorkspaceCompactSignalsNotFoundError) throw error

    captureWithDomain(error, 'agency', {
      tags: { source: 'organization_workspace_compact_signals' },
      extra: { organizationId: input.organizationId, entrypointContext: input.entrypointContext }
    })

    const now = new Date()
    const periodDefaults = currentPeriod()

    return buildUnavailablePayload({
      organizationId: input.organizationId,
      entrypointContext: input.entrypointContext,
      asOf: toDateOnly(input.asOf),
      period: {
        year: input.periodYear ?? periodDefaults.year,
        month: input.periodMonth ?? periodDefaults.month
      },
      projection: {
        organizationId: input.organizationId,
        entrypointContext: input.entrypointContext,
        relationship: { kind: 'no_relation', subjectUserId: input.subject.userId, organizationId: input.organizationId },
        visibleFacets: [],
        visibleTabs: [],
        defaultFacet: null,
        allowedActions: [],
        fieldRedactions: {},
        degradedMode: true,
        degradedReason: 'relationship_lookup_failed',
        cacheKey: `${input.subject.userId}:${input.organizationId}:${input.entrypointContext}`,
        computedAt: now
      },
      degradedSources: [{
        source: 'workspace_projection',
        status: 'error',
        observedAt: now.toISOString(),
        durationMs: 0,
        error: error instanceof Error ? error.message : 'Unknown compact signals error'
      }],
      provenance: [],
      sourceFreshness: {
        workspace_projection: now.toISOString(),
        organization_360: null,
        account_360: null,
        projects: null,
        finance_summary: null,
        client_lifecycle: null,
        reliability_signals: null
      }
    })
  }
}
