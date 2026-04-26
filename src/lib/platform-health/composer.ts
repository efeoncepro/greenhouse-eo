import 'server-only'

import { getCloudPlatformHealthSnapshot } from '@/lib/cloud/health'
import { getCloudObservabilityPosture, getCloudSentryIncidents } from '@/lib/cloud/observability'
import { getIntegrationHealthSnapshots } from '@/lib/integrations/health'
import { redactSensitive } from '@/lib/observability/redact'
import { getOperationsOverview } from '@/lib/operations/get-operations-overview'
import { getReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
import { getLatestSyntheticSnapshotsByRoute } from '@/lib/reliability/synthetic/reader'

import type {
  CloudHealthSnapshot,
  CloudObservabilityPosture,
  CloudSentryIncidentsSnapshot
} from '@/lib/cloud/contracts'
import type { IntegrationHealthSnapshot } from '@/types/integrations'
import type { OperationsOverview } from '@/lib/operations/get-operations-overview'
import type { ReliabilityModuleSnapshot, ReliabilityOverview, ReliabilitySeverity } from '@/types/reliability'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

import {
  PLATFORM_HEALTH_CONTRACT_VERSION,
  type PlatformConfidence,
  type PlatformEnvironment,
  type PlatformHealthAudience,
  type PlatformHealthDegradedSource,
  type PlatformHealthIssue,
  type PlatformHealthModule,
  type PlatformHealthSeverity,
  type PlatformHealthV1,
  type PlatformOverallStatus
} from '@/types/platform-health'

import { readPlatformHealthCache, writePlatformHealthCache } from './cache'
import { collectRecommendedChecks } from './recommended-checks'
import { buildCheckTriggerSet, deriveSafeModes } from './safe-modes'
import { withSourceTimeout, type SourceResult } from './with-source-timeout'

const TRACKED_INTEGRATION_KEYS = ['notion', 'hubspot', 'nubox', 'microsoft', 'google'] as const

/**
 * Sources contributing to the composed payload. Names are stable strings
 * because they appear in `degradedSources[].source` and recommended-checks
 * triggers — keep them in sync with `recommended-checks.ts`.
 */
type SourceName =
  | 'reliability_control_plane'
  | 'operations_overview'
  | 'internal_runtime_health'
  | 'observability_posture'
  | 'sentry_incidents'
  | 'integration_readiness'
  | 'synthetic_monitoring'
  | 'webhook_delivery'

interface ComposerInput {
  reliability: SourceResult<ReliabilityOverview>
  operations: SourceResult<OperationsOverview>
  cloudHealth: SourceResult<CloudHealthSnapshot>
  observability: SourceResult<CloudObservabilityPosture>
  sentry: SourceResult<CloudSentryIncidentsSnapshot>
  synthetics: SourceResult<SyntheticRouteSnapshot[]>
  integrations: SourceResult<Map<string, IntegrationHealthSnapshot>>
}

interface ComposeOptions {
  audience: PlatformHealthAudience
  /**
   * If true, bypass the in-process cache. Used by tests and by the cron
   * that pre-warms the contract; never true for normal user requests.
   */
  bypassCache?: boolean
}

const detectEnvironment = (): PlatformEnvironment => {
  const raw =
    process.env.VERCEL_TARGET_ENV?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV?.trim() ||
    null

  switch (raw) {
    case 'production':
      return 'production'
    case 'preview':
      return 'preview'
    case 'staging':
      return 'staging'
    case 'development':
    case 'test':
      return 'development'
    default:
      return 'unknown'
  }
}

const fromReliabilitySeverity = (severity: ReliabilitySeverity): PlatformOverallStatus => {
  switch (severity) {
    case 'ok':
      return 'healthy'
    case 'warning':
      return 'degraded'
    case 'error':
      return 'blocked'
    case 'not_configured':
    case 'awaiting_data':
    case 'unknown':
    default:
      return 'unknown'
  }
}

const fromReliabilitySignalSeverity = (severity: ReliabilitySeverity): PlatformHealthSeverity => {
  switch (severity) {
    case 'ok':
      return 'ok'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'not_configured':
    case 'awaiting_data':
    case 'unknown':
    default:
      return 'unknown'
  }
}

/**
 * Reduce a module's signals to the top issues consumers should act on.
 * Only signals with severity >= warning are surfaced; AI summaries are
 * excluded (they're narrative, not deterministic evidence) — same rule
 * applied by `aggregateModuleStatus`.
 */
const buildModuleTopIssues = (
  module: ReliabilityModuleSnapshot,
  audience: PlatformHealthAudience
): PlatformHealthIssue[] => {
  const sortedSignals = [...module.signals]
    .filter(signal => signal.kind !== 'ai_summary')
    .filter(signal => signal.severity === 'error' || signal.severity === 'warning')
    .sort((a, b) => (a.severity === 'error' ? -1 : 1) - (b.severity === 'error' ? -1 : 1))

  const limit = audience === 'admin' ? 5 : 3

  return sortedSignals.slice(0, limit).map(signal => {
    const evidenceRefs = audience === 'admin'
      ? signal.evidence.map(ev => `${ev.kind}:${ev.value}`)
      : []

    return {
      moduleKey: module.moduleKey,
      severity: fromReliabilitySignalSeverity(signal.severity),
      source: signal.source,
      summary:
        audience === 'admin'
          ? redactSensitive(signal.summary)
          : redactSensitive(signal.summary).slice(0, 160),
      evidenceRefs,
      ownerDomain: module.domain,
      observedAt: signal.observedAt
    }
  })
}

const buildSourceFreshness = (
  module: ReliabilityModuleSnapshot
): Record<string, string | null> => {
  const out: Record<string, string | null> = {}

  for (const signal of module.signals) {
    if (out[signal.source] === undefined) {
      out[signal.source] = signal.observedAt
    }
  }

  return out
}

const buildModule = (
  module: ReliabilityModuleSnapshot,
  audience: PlatformHealthAudience
): PlatformHealthModule => ({
  moduleKey: module.moduleKey,
  label: module.label,
  domain: module.domain,
  status: fromReliabilitySeverity(module.status),
  confidence: module.confidence,
  summary: redactSensitive(module.summary),
  topIssues: buildModuleTopIssues(module, audience),
  sourceFreshness: buildSourceFreshness(module)
})

/**
 * Roll up the module statuses into a global status. Conservative: any
 * blocked module blocks; any degraded module degrades; any unknown
 * module pulls confidence down.
 */
const rollupOverallStatus = (modules: PlatformHealthModule[]): PlatformOverallStatus => {
  if (modules.length === 0) return 'unknown'

  if (modules.some(m => m.status === 'blocked')) return 'blocked'
  if (modules.some(m => m.status === 'degraded')) return 'degraded'
  if (modules.every(m => m.status === 'healthy')) return 'healthy'

  return 'unknown'
}

const rollupConfidence = (
  modules: PlatformHealthModule[],
  degradedSourceCount: number
): PlatformConfidence => {
  if (modules.length === 0) return 'unknown'

  const lowConfidenceModules = modules.filter(
    m => m.confidence === 'low' || m.confidence === 'unknown'
  ).length

  if (degradedSourceCount >= 3) return 'low'
  if (degradedSourceCount >= 1 || lowConfidenceModules >= 2) return 'medium'
  if (modules.every(m => m.confidence === 'high')) return 'high'

  return 'medium'
}

const collectBlockingIssues = (modules: PlatformHealthModule[]): PlatformHealthIssue[] =>
  modules.flatMap(module => module.topIssues.filter(issue => issue.severity === 'error'))

const collectWarnings = (modules: PlatformHealthModule[]): PlatformHealthIssue[] =>
  modules.flatMap(module => module.topIssues.filter(issue => issue.severity === 'warning'))

const buildDegradedSourceList = (input: ComposerInput): PlatformHealthDegradedSource[] => {
  const sources: { name: SourceName; result: SourceResult<unknown> }[] = [
    { name: 'reliability_control_plane', result: input.reliability },
    { name: 'operations_overview', result: input.operations },
    { name: 'internal_runtime_health', result: input.cloudHealth },
    { name: 'observability_posture', result: input.observability },
    { name: 'sentry_incidents', result: input.sentry },
    { name: 'synthetic_monitoring', result: input.synthetics },
    { name: 'integration_readiness', result: input.integrations }
  ]

  return sources
    .filter(({ result }) => result.status !== 'ok')
    .map(({ name, result }) => ({
      source: name,
      status: result.status,
      observedAt: result.observedAt,
      summary:
        result.error ??
        (result.status === 'not_configured'
          ? `source '${name}' is not configured`
          : `source '${name}' returned ${result.status}`)
    }))
}

/**
 * Fetch every source in parallel via Promise.allSettled wrapped with
 * `withSourceTimeout`. The composer NEVER awaits a single Promise that
 * could fail the whole response — it always uses a per-source budget.
 */
const fetchAllSources = async (): Promise<ComposerInput> => {
  const [reliability, operations, cloudHealth, observability, sentry, synthetics, integrations] =
    await Promise.all([
      withSourceTimeout(() => getReliabilityOverview(), {
        source: 'reliability_control_plane',
        timeoutMs: 6_000
      }),
      withSourceTimeout(() => getOperationsOverview(), {
        source: 'operations_overview',
        timeoutMs: 5_000
      }),
      withSourceTimeout(() => getCloudPlatformHealthSnapshot(), {
        source: 'internal_runtime_health',
        timeoutMs: 5_000
      }),
      withSourceTimeout(async () => getCloudObservabilityPosture(), {
        source: 'observability_posture',
        timeoutMs: 2_000
      }),
      withSourceTimeout(() => getCloudSentryIncidents(process.env, {}), {
        source: 'sentry_incidents',
        timeoutMs: 3_000
      }),
      withSourceTimeout(() => getLatestSyntheticSnapshotsByRoute(), {
        source: 'synthetic_monitoring',
        timeoutMs: 3_000
      }),
      withSourceTimeout(
        () => getIntegrationHealthSnapshots([...TRACKED_INTEGRATION_KEYS]),
        { source: 'integration_readiness', timeoutMs: 4_000 }
      )
    ])

  return { reliability, operations, cloudHealth, observability, sentry, synthetics, integrations }
}

/**
 * Compose the Platform Health V1 payload.
 *
 * Fully deterministic given the source results — the input fan-out is the
 * only side-effect surface. Tests can call `composeFromSources` directly
 * with synthetic inputs to assert payload shape under arbitrary source
 * states.
 */
export const composeFromSources = (
  input: ComposerInput,
  audience: PlatformHealthAudience
): PlatformHealthV1 => {
  const generatedAt = new Date().toISOString()
  const environment = detectEnvironment()

  const reliabilityModules = input.reliability.value?.modules ?? []
  const modules = reliabilityModules.map(m => buildModule(m, audience))

  const blockingIssues = collectBlockingIssues(modules)
  const warnings = collectWarnings(modules)
  const overallStatus = rollupOverallStatus(modules)

  const degradedSources = buildDegradedSourceList(input)
  const confidence = rollupConfidence(modules, degradedSources.length)

  const safeModes = deriveSafeModes({ overallStatus, modules, blockingIssues })

  const triggers = buildCheckTriggerSet({
    overallStatus,
    modules,
    safeModes,
    degradedSources: degradedSources.map(d => ({ source: d.source, status: d.status }))
  })

  const recommendedChecks = collectRecommendedChecks(triggers)

  return {
    contractVersion: PLATFORM_HEALTH_CONTRACT_VERSION,
    generatedAt,
    environment,
    overallStatus,
    confidence,
    safeModes,
    modules,
    blockingIssues,
    warnings,
    recommendedChecks,
    degradedSources
  }
}

export const getPlatformHealth = async (
  options: ComposeOptions
): Promise<PlatformHealthV1> => {
  if (!options.bypassCache) {
    const cached = readPlatformHealthCache(options.audience)

    if (cached) return cached
  }

  const input = await fetchAllSources()
  const payload = composeFromSources(input, options.audience)

  if (!options.bypassCache) {
    writePlatformHealthCache(options.audience, payload)
  }

  return payload
}

export const __composerInternalsForTests = {
  detectEnvironment,
  rollupOverallStatus,
  rollupConfidence,
  buildModule,
  buildDegradedSourceList,
  fromReliabilitySeverity
}
