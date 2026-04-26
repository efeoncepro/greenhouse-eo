import { describe, it, expect } from 'vitest'

import type {
  CloudHealthSnapshot,
  CloudObservabilityPosture,
  CloudSentryIncidentsSnapshot
} from '@/lib/cloud/contracts'
import type { IntegrationHealthSnapshot } from '@/types/integrations'
import type { OperationsOverview } from '@/lib/operations/get-operations-overview'
import type { ReliabilityOverview, ReliabilityModuleSnapshot } from '@/types/reliability'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

import { composeFromSources } from './composer'
import type { SourceResult } from './with-source-timeout'

// ── Stub builders ─────────────────────────────────────────────────────

const okResult = <T>(source: string, value: T): SourceResult<T> => ({
  source,
  status: 'ok',
  value,
  observedAt: '2026-04-26T18:00:00.000Z',
  durationMs: 12,
  error: null
})

const timeoutResult = <T>(source: string): SourceResult<T> => ({
  source,
  status: 'timeout',
  value: null,
  observedAt: '2026-04-26T18:00:00.000Z',
  durationMs: 4_000,
  error: `source '${source}' exceeded 4000ms budget`
})

const errorResult = <T>(source: string, error: string): SourceResult<T> => ({
  source,
  status: 'error',
  value: null,
  observedAt: '2026-04-26T18:00:00.000Z',
  durationMs: 50,
  error
})

const moduleSnap = (
  moduleKey: 'cloud' | 'finance' | 'delivery' | 'integrations.notion',
  status: 'ok' | 'warning' | 'error',
  domain: 'platform' | 'integrations' | 'finance' | 'delivery'
): ReliabilityModuleSnapshot => ({
  moduleKey,
  label: moduleKey,
  description: `${moduleKey} stub`,
  domain,
  status,
  confidence: 'high',
  summary: `${moduleKey} is ${status}`,
  routes: [],
  apis: [],
  dependencies: [],
  smokeTests: [],
  signals: [
    {
      signalId: `${moduleKey}.signal.subsystem`,
      moduleKey,
      kind: 'subsystem',
      source: 'getOperationsOverview',
      label: 'Stub subsystem signal',
      severity: status,
      summary:
        status === 'error'
          ? 'Subsystem returned error: Bearer abc1234567890def must be redacted'
          : `${moduleKey} subsystem ok`,
      evidence: [{ kind: 'helper', label: 'stub', value: 'src/test/stub.ts' }],
      observedAt: '2026-04-26T17:55:00.000Z'
    }
  ],
  signalCounts: {
    ok: status === 'ok' ? 1 : 0,
    warning: status === 'warning' ? 1 : 0,
    error: status === 'error' ? 1 : 0,
    unknown: 0,
    not_configured: 0,
    awaiting_data: 0
  },
  expectedSignalKinds: ['subsystem'],
  missingSignalKinds: []
})

const reliabilityOverview = (
  modules: ReliabilityModuleSnapshot[]
): ReliabilityOverview => ({
  generatedAt: '2026-04-26T18:00:00.000Z',
  modules,
  totals: {
    totalModules: modules.length,
    healthy: modules.filter(m => m.status === 'ok').length,
    warning: modules.filter(m => m.status === 'warning').length,
    error: modules.filter(m => m.status === 'error').length,
    unknownOrPending: 0
  },
  integrationBoundaries: [],
  notes: []
})

const allOkSources = () => ({
  reliability: okResult(
    'reliability_control_plane',
    reliabilityOverview([
      moduleSnap('cloud', 'ok', 'platform'),
      moduleSnap('finance', 'ok', 'finance'),
      moduleSnap('delivery', 'ok', 'delivery'),
      moduleSnap('integrations.notion', 'ok', 'integrations')
    ])
  ),
  operations: okResult('operations_overview', {} as OperationsOverview),
  cloudHealth: okResult('internal_runtime_health', {} as CloudHealthSnapshot),
  observability: okResult('observability_posture', {} as CloudObservabilityPosture),
  sentry: okResult('sentry_incidents', {} as CloudSentryIncidentsSnapshot),
  synthetics: okResult('synthetic_monitoring', [] as SyntheticRouteSnapshot[]),
  integrations: okResult(
    'integration_readiness',
    new Map<string, IntegrationHealthSnapshot>()
  )
})

// ── Tests ─────────────────────────────────────────────────────────────

describe('composeFromSources', () => {
  it('produces a healthy payload when every source returns ok and modules are healthy', () => {
    const out = composeFromSources(allOkSources(), 'admin')

    expect(out.contractVersion).toBe('platform-health.v1')
    expect(out.overallStatus).toBe('healthy')
    expect(out.confidence).toBe('high')
    expect(out.modules).toHaveLength(4)
    expect(out.blockingIssues).toHaveLength(0)
    expect(out.warnings).toHaveLength(0)
    expect(out.degradedSources).toHaveLength(0)
    expect(out.recommendedChecks).toHaveLength(0)
    expect(out.safeModes).toEqual({
      readSafe: true,
      writeSafe: true,
      deploySafe: true,
      backfillSafe: true,
      notifySafe: true,
      agentAutomationSafe: true
    })
  })

  it('rolls up to blocked when any module is in error state', () => {
    const sources = allOkSources()

    sources.reliability = okResult(
      'reliability_control_plane',
      reliabilityOverview([
        moduleSnap('cloud', 'error', 'platform'),
        moduleSnap('finance', 'ok', 'finance'),
        moduleSnap('delivery', 'ok', 'delivery'),
        moduleSnap('integrations.notion', 'ok', 'integrations')
      ])
    )

    const out = composeFromSources(sources, 'admin')

    expect(out.overallStatus).toBe('blocked')
    expect(out.blockingIssues).toHaveLength(1)
    expect(out.blockingIssues[0].moduleKey).toBe('cloud')
    expect(out.safeModes.writeSafe).toBe(false)
    expect(out.safeModes.deploySafe).toBe(false)
    expect(out.safeModes.agentAutomationSafe).toBe(false)
    expect(out.recommendedChecks.some(c => c.id === 'pg-doctor')).toBe(true)
  })

  it('degrades source list and lowers confidence when a source times out', () => {
    const sources = allOkSources()

    sources.synthetics = timeoutResult<SyntheticRouteSnapshot[]>('synthetic_monitoring')

    const out = composeFromSources(sources, 'admin')

    expect(out.overallStatus).toBe('healthy')
    expect(out.degradedSources).toHaveLength(1)
    expect(out.degradedSources[0]).toMatchObject({
      source: 'synthetic_monitoring',
      status: 'timeout'
    })
    expect(out.confidence).toBe('medium')
    expect(out.recommendedChecks.some(c => c.id === 'rerun-synthetic-sweep')).toBe(true)
  })

  it('emits unknown when reliability source itself is unavailable', () => {
    const sources = allOkSources()

    sources.reliability = errorResult<ReliabilityOverview>(
      'reliability_control_plane',
      'connection refused'
    )

    const out = composeFromSources(sources, 'admin')

    expect(out.overallStatus).toBe('unknown')
    expect(out.modules).toHaveLength(0)
    expect(out.degradedSources.some(d => d.source === 'reliability_control_plane')).toBe(true)
  })

  it('redacts sensitive substrings inside summaries leaving the rest intact', () => {
    const sources = allOkSources()

    sources.reliability = okResult(
      'reliability_control_plane',
      reliabilityOverview([
        moduleSnap('cloud', 'error', 'platform'),
        moduleSnap('finance', 'ok', 'finance'),
        moduleSnap('delivery', 'ok', 'delivery'),
        moduleSnap('integrations.notion', 'ok', 'integrations')
      ])
    )

    const out = composeFromSources(sources, 'admin')

    expect(out.blockingIssues[0].summary).not.toContain('abc1234567890def')
    expect(out.blockingIssues[0].summary).toContain('[redacted:bearer]')
  })

  it('drops evidenceRefs and trims summary length for ecosystem audience', () => {
    const sources = allOkSources()

    sources.reliability = okResult(
      'reliability_control_plane',
      reliabilityOverview([
        moduleSnap('cloud', 'error', 'platform'),
        moduleSnap('finance', 'ok', 'finance'),
        moduleSnap('delivery', 'ok', 'delivery'),
        moduleSnap('integrations.notion', 'ok', 'integrations')
      ])
    )

    const out = composeFromSources(sources, 'ecosystem')

    expect(out.blockingIssues[0].evidenceRefs).toEqual([])
    expect(out.blockingIssues[0].summary.length).toBeLessThanOrEqual(160)
  })

  it('does not mutate input source results', () => {
    const sources = allOkSources()
    const before = JSON.parse(JSON.stringify(sources))

    composeFromSources(sources, 'admin')

    expect(JSON.parse(JSON.stringify(sources))).toEqual(before)
  })
})
