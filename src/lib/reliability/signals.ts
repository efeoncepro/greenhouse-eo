import type {
  CloudHealthCheck,
  CloudPostureCheck,
  CloudSentryIncidentsSnapshot,
  CloudObservabilityPosture
} from '@/lib/cloud/contracts'
import type { NotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import type {
  BlockedQueryEntry,
  CloudPlatformOverview,
  OperationsSubsystem
} from '@/lib/operations/get-operations-overview'
import type { GcpBillingOverview } from '@/types/billing-export'
import type { FinanceSmokeLaneStatus } from '@/types/finance-smoke-lane'
import type { IntegrationDataQualityOverview } from '@/types/integration-data-quality'
import type {
  ReliabilityModuleKey,
  ReliabilitySeverity,
  ReliabilitySignal,
  ReliabilitySignalKind
} from '@/types/reliability'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

import { correlateIncident } from './incident-mapping'
import {
  fromCloudHealthStatus,
  fromCloudPostureStatus,
  fromDataQualityStatus,
  fromOperationsHealth,
  fromSentryLevel
} from './severity'

const MAX_SENTRY_INCIDENTS_PER_MODULE = 3

/**
 * Maps an `OperationsSubsystem.name` to the reliability module that owns it.
 * Subsystems that don't belong to a critical reliability module are dropped
 * from the registry view — they remain visible in `Ops Health` itself.
 */
const SUBSYSTEM_MODULE_MAP: Record<string, ReliabilityModuleKey> = {
  // Cloud platform plumbing — visible as `cloud` reliability
  Outbox: 'cloud',
  Proyecciones: 'cloud',
  'Reactive backlog': 'cloud',
  'Reactive Worker': 'cloud',
  Notificaciones: 'cloud',
  'Services Sync': 'cloud',

  // Notion integration
  'Notion Sync': 'integrations.notion',
  'Notion Delivery Data Quality': 'integrations.notion',

  // Delivery (ICO + AI enrichment over delivery work)
  'ICO Sync': 'delivery',
  'AI Core': 'delivery',
  'AI LLM Enrichment': 'delivery',

  // Finance
  'Finance Data Quality': 'finance',

  // Teams notifications & bot (TASK-669 + TASK-671)
  'Teams Notifications': 'integrations.teams',

  // Payroll (TASK-729) — domain HR, módulo first-class en Reliability Control Plane
  'Payroll Data Quality': 'payroll'
}

const subsystemSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

export const buildSubsystemSignals = (subsystems: OperationsSubsystem[]): ReliabilitySignal[] => {
  const signals: ReliabilitySignal[] = []

  for (const subsystem of subsystems) {
    const moduleKey = SUBSYSTEM_MODULE_MAP[subsystem.name]

    if (!moduleKey) continue

    const severity = fromOperationsHealth(subsystem.status)

    const fallbackSummaryParts = [
      `${subsystem.processed} procesado${subsystem.processed === 1 ? '' : 's'}`,
      subsystem.failed > 0 ? `${subsystem.failed} con falla` : null,
      subsystem.lastRun ? `último: ${subsystem.lastRun}` : 'sin último run'
    ].filter(Boolean) as string[]

    signals.push({
      signalId: `subsystem.${subsystemSlug(subsystem.name)}`,
      moduleKey,
      kind: 'subsystem',
      source: 'getOperationsOverview',
      label: `Subsystem: ${subsystem.name}`,
      severity,
      summary: subsystem.summary?.trim() || fallbackSummaryParts.join(' · '),
      observedAt: subsystem.lastRun,
      evidence: [
        {
          kind: 'helper',
          label: 'Operations overview',
          value: 'src/lib/operations/get-operations-overview.ts'
        },
        {
          kind: 'metric',
          label: 'Status',
          value: subsystem.status
        },
        ...(subsystem.metrics ?? []).map(metric => ({
          kind: 'metric' as const,
          label: metric.label,
          value: `${metric.value} (${metric.status})`
        }))
      ]
    })
  }

  return signals
}

const buildRuntimeCheckSignal = (check: CloudHealthCheck): ReliabilitySignal => ({
  signalId: `cloud.runtime.${check.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  moduleKey: 'cloud',
  kind: 'runtime',
  source: 'getCloudHealthSnapshot',
  label: `Runtime: ${check.name}`,
  severity: fromCloudHealthStatus(check.status),
  summary: check.summary,
  observedAt: null,
  evidence: [
    {
      kind: 'endpoint',
      label: 'Internal health probe',
      value: '/api/internal/health'
    },
    {
      kind: 'metric',
      label: 'Latency',
      value: typeof check.latencyMs === 'number' ? `${check.latencyMs} ms` : 'n/a'
    }
  ]
})

const buildPostureCheckSignal = (check: CloudPostureCheck): ReliabilitySignal => ({
  signalId: `cloud.posture.${check.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  moduleKey: 'cloud',
  kind: 'posture',
  source: 'getCloudHealthSnapshot',
  label: `Posture: ${check.name}`,
  severity: fromCloudPostureStatus(check.status),
  summary: check.summary,
  observedAt: null,
  evidence: [
    {
      kind: 'doc',
      label: 'Cloud posture spec',
      value: 'docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md'
    }
  ]
})

export const buildCloudSignals = (cloud: CloudPlatformOverview): ReliabilitySignal[] => {
  const signals: ReliabilitySignal[] = []

  for (const check of cloud.health.runtimeChecks) {
    signals.push(buildRuntimeCheckSignal(check))
  }

  for (const check of cloud.health.postureChecks) {
    signals.push(buildPostureCheckSignal(check))
  }

  signals.push(buildBigQueryCostGuardSignal(cloud.bigquery.blockedQueries, cloud.bigquery.maximumBytesBilled))

  return signals
}

const buildBigQueryCostGuardSignal = (
  blocked: BlockedQueryEntry[],
  maxBytesBilled: number
): ReliabilitySignal => {
  const blockedCount = blocked.length

  const severity = blockedCount === 0 ? 'ok' : blockedCount > 5 ? 'error' : 'warning'

  const summary =
    blockedCount === 0
      ? `Sin queries bloqueadas. Cap activo en ${maxBytesBilled.toLocaleString('es-CL')} bytes.`
      : `${blockedCount} queries excedieron el cap (${maxBytesBilled.toLocaleString('es-CL')} bytes).`

  return {
    signalId: 'cloud.cost_guard.bigquery',
    moduleKey: 'cloud',
    kind: 'cost_guard',
    source: 'getBlockedQueries',
    label: 'BigQuery cost guard',
    severity,
    summary,
    observedAt: blocked[0]?.timestamp ?? null,
    evidence: [
      {
        kind: 'helper',
        label: 'Cost guard helper',
        value: 'src/lib/bigquery.ts:getBlockedQueries'
      },
      {
        kind: 'metric',
        label: 'Cap bytes billed',
        value: String(maxBytesBilled)
      }
    ]
  }
}

export const buildSentryIncidentSignals = (snapshot: CloudSentryIncidentsSnapshot): ReliabilitySignal[] => {
  if (snapshot.status === 'unconfigured') {
    return [
      {
        signalId: 'cloud.incident.sentry',
        moduleKey: 'cloud',
        kind: 'incident',
        source: 'getCloudSentryIncidents',
        label: 'Sentry incidents reader',
        severity: 'not_configured',
        summary: snapshot.summary,
        observedAt: snapshot.fetchedAt,
        evidence: [
          {
            kind: 'doc',
            label: 'Observability spec',
            value: 'docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md'
          }
        ]
      }
    ]
  }

  if (snapshot.incidents.length === 0) {
    return [
      {
        signalId: 'cloud.incident.sentry',
        moduleKey: 'cloud',
        kind: 'incident',
        source: 'getCloudSentryIncidents',
        label: 'Sentry incidents',
        severity: snapshot.error ? 'unknown' : 'ok',
        summary: snapshot.error ? `Reader error: ${snapshot.error}` : 'Sin incidentes abiertos',
        observedAt: snapshot.fetchedAt,
        evidence: [
          {
            kind: 'helper',
            label: 'Sentry reader',
            value: 'src/lib/cloud/observability.ts:getCloudSentryIncidents'
          }
        ]
      }
    ]
  }

  // TASK-634: each incident is correlated to its real module (finance,
  // delivery, integrations.notion). Incidents that don't match any rule
  // fall back to `cloud` with `signalId` suffix `.uncorrelated.<id>`.
  // We cap incidents PER MODULE so finance always sees its own top N
  // even when cloud has many uncorrelated entries.
  const seenByModule = new Map<ReliabilityModuleKey, number>()
  const signals: ReliabilitySignal[] = []

  for (const incident of snapshot.incidents) {
    const correlation = correlateIncident(incident)
    const moduleKey = correlation.moduleKey
    const seen = seenByModule.get(moduleKey) ?? 0

    if (seen >= MAX_SENTRY_INCIDENTS_PER_MODULE) continue

    seenByModule.set(moduleKey, seen + 1)

    const isUncorrelated = correlation.source === 'fallback'
    const incidentRef = incident.shortId ?? incident.id

    const signalId = isUncorrelated
      ? `cloud.incident.sentry.uncorrelated.${incidentRef}`
      : `${moduleKey}.incident.sentry.${incidentRef}`

    const evidence: ReliabilitySignal['evidence'] = incident.permalink
      ? [{ kind: 'incident', label: 'Sentry link', value: incident.permalink }]
      : [{ kind: 'incident', label: 'Sentry id', value: incident.id }]

    if (correlation.matchedPattern) {
      evidence.push({
        kind: 'metric',
        label: `Correlation (${correlation.source})`,
        value: correlation.matchedPattern
      })
    }

    signals.push({
      signalId,
      moduleKey,
      kind: 'incident',
      source: 'getCloudSentryIncidents',
      label: incident.shortId ? `Sentry ${incident.shortId}` : 'Sentry incident',
      severity: fromSentryLevel(incident.level),
      summary: `${incident.title} · ${incident.count} eventos · ${incident.userCount} usuarios`,
      observedAt: incident.lastSeen,
      evidence
    })
  }

  return signals
}

/**
 * Per-module Sentry incident signals via the `domain` tag.
 *
 * The legacy `buildSentryIncidentSignals` reads the GLOBAL Sentry feed and
 * uses the `incident-mapping` heuristic to guess which module each issue
 * belongs to. That works but produces noisy "uncorrelated" signals when the
 * heuristic doesn't match.
 *
 * This builder is the structurally cleaner path: the consumer iterates the
 * registry's `incidentDomainTag` entries and calls `getCloudSentryIncidents({
 * domain })` per module. Each domain-filtered snapshot becomes the
 * `incident` signal for that module — direct mapping, no heuristic.
 *
 * Both builders coexist: `buildSentryIncidentSignals` keeps the global feed
 * as a safety net for incidents that don't carry the `domain` tag yet.
 * `buildDomainIncidentSignals` produces clean per-module signals for code
 * paths that DO use `captureWithDomain` (which is the canonical wrapper
 * going forward).
 */
export const buildDomainIncidentSignals = (
  byModule: Record<string, CloudSentryIncidentsSnapshot>
): ReliabilitySignal[] => {
  const signals: ReliabilitySignal[] = []

  for (const [moduleKey, snapshot] of Object.entries(byModule)) {
    const baseId = `${moduleKey}.incident.domain`

    if (snapshot.status === 'unconfigured') {
      signals.push({
        signalId: baseId,
        moduleKey: moduleKey as ReliabilityModuleKey,
        kind: 'incident',
        source: 'getCloudSentryIncidents',
        label: 'Sentry incidents (domain-tag)',
        severity: 'not_configured',
        summary: snapshot.summary,
        observedAt: snapshot.fetchedAt,
        evidence: [
          {
            kind: 'helper',
            label: 'Sentry reader',
            value: `src/lib/cloud/observability.ts:getCloudSentryIncidents({ domain: '${moduleKey}' })`
          }
        ]
      })
      continue
    }

    if (snapshot.incidents.length === 0) {
      signals.push({
        signalId: baseId,
        moduleKey: moduleKey as ReliabilityModuleKey,
        kind: 'incident',
        source: 'getCloudSentryIncidents',
        label: 'Sentry incidents (domain-tag)',
        severity: snapshot.error ? 'unknown' : 'ok',
        summary: snapshot.error
          ? `Reader error: ${snapshot.error}`
          : `Sin incidentes Sentry tagged domain:${moduleKey}`,
        observedAt: snapshot.fetchedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'Domain filter',
            value: `tags[domain]:${moduleKey}`
          }
        ]
      })
      continue
    }

    let appended = 0

    for (const incident of snapshot.incidents) {
      if (appended >= MAX_SENTRY_INCIDENTS_PER_MODULE) break

      appended += 1

      const incidentRef = incident.shortId ?? incident.id

      const evidence: ReliabilitySignal['evidence'] = incident.permalink
        ? [{ kind: 'incident', label: 'Sentry link', value: incident.permalink }]
        : [{ kind: 'incident', label: 'Sentry id', value: incident.id }]

      evidence.push({ kind: 'metric', label: 'Domain tag', value: moduleKey })

      signals.push({
        signalId: `${baseId}.${incidentRef}`,
        moduleKey: moduleKey as ReliabilityModuleKey,
        kind: 'incident',
        source: 'getCloudSentryIncidents',
        label: incident.shortId ? `Sentry ${incident.shortId}` : 'Sentry incident',
        severity: fromSentryLevel(incident.level),
        summary: `${incident.title} · ${incident.count} eventos · ${incident.userCount} usuarios · domain:${moduleKey}`,
        observedAt: incident.lastSeen,
        evidence
      })
    }
  }

  return signals
}

export const buildObservabilityPostureSignal = (
  posture: CloudObservabilityPosture
): ReliabilitySignal => ({
  signalId: 'cloud.posture.observability',
  moduleKey: 'cloud',
  kind: 'posture',
  source: 'getCloudObservabilityPosture',
  label: 'Observability posture',
  severity: posture.sentry.enabled ? (posture.sentry.sourceMapsReady ? 'ok' : 'warning') : 'not_configured',
  summary: posture.summary,
  observedAt: null,
  evidence: [
    {
      kind: 'helper',
      label: 'Observability posture helper',
      value: 'src/lib/cloud/observability.ts:getCloudObservabilityPosture'
    }
  ]
})

export const buildNotionDataQualitySignals = (
  overview: IntegrationDataQualityOverview | null | undefined
): ReliabilitySignal[] => {
  if (!overview) {
    const observed = new Date().toISOString()

    return [
      {
        signalId: 'integrations.notion.data_quality',
        moduleKey: 'integrations.notion',
        kind: 'data_quality',
        source: 'getNotionDeliveryDataQualityOverview',
        label: 'Notion delivery data quality',
        severity: 'awaiting_data',
        summary: 'Aún no hay corridas de auditoría disponibles.',
        observedAt: observed,
        evidence: [
          {
            kind: 'sql',
            label: 'Audit table',
            value: 'greenhouse_sync.integration_data_quality_runs'
          }
        ]
      }
    ]
  }

  if (overview.totals.totalSpaces === 0) {
    return [
      {
        signalId: 'integrations.notion.data_quality',
        moduleKey: 'integrations.notion',
        kind: 'data_quality',
        source: 'getNotionDeliveryDataQualityOverview',
        label: 'Notion delivery data quality',
        severity: 'awaiting_data',
        summary: 'No hay spaces auditados todavía.',
        observedAt: overview.generatedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Audit table',
            value: 'greenhouse_sync.integration_data_quality_runs'
          }
        ]
      }
    ]
  }

  // Spaces whose only failure is auto-recoverable lag (`fresh_raw_after_conformed_sync`)
  // are downgraded from `broken` to `degraded`. The conformed sync watcher will
  // re-trigger a sync, so it's not an incident — it's expected eventual consistency.
  const manualBrokenSpaces = overview.latestBySpace.filter(
    space => space.qualityStatus === 'broken' && space.recoveryClass === 'manual'
  ).length

  const autoRecoverableSpaces = overview.totals.autoRecoverableSpaces ?? 0

  const aggregateStatus: 'healthy' | 'degraded' | 'broken' = manualBrokenSpaces > 0
    ? 'broken'
    : (overview.totals.degradedSpaces > 0 || autoRecoverableSpaces > 0 || overview.totals.unknownSpaces > 0)
      ? 'degraded'
      : 'healthy'

  // Surface the *actual* failing checks in the summary so on-call sees what
  // broke, not just "2 con falla".
  const failedCheckBreakdown = aggregateFailedCheckCounts(overview.latestBySpace)

  const baseSummary = [
    `${overview.totals.totalSpaces} spaces`,
    `${overview.totals.healthySpaces} sanos`,
    overview.totals.degradedSpaces > 0 ? `${overview.totals.degradedSpaces} degradados` : null,
    manualBrokenSpaces > 0 ? `${manualBrokenSpaces} rotos (intervención)` : null,
    autoRecoverableSpaces > 0 ? `${autoRecoverableSpaces} con lag auto-recuperable` : null,
    overview.totals.unknownSpaces > 0 ? `${overview.totals.unknownSpaces} sin estado` : null
  ]
    .filter(Boolean)
    .join(' · ')

  const summary = failedCheckBreakdown
    ? `${baseSummary} — checks: ${failedCheckBreakdown}`
    : baseSummary

  const evidence = [
    {
      kind: 'sql' as const,
      label: 'Audit table',
      value: 'greenhouse_sync.integration_data_quality_runs'
    },
    {
      kind: 'helper' as const,
      label: 'DQ overview helper',
      value: 'src/lib/integrations/notion-delivery-data-quality.ts'
    }
  ]

  return [
    {
      signalId: 'integrations.notion.data_quality',
      moduleKey: 'integrations.notion',
      kind: 'data_quality',
      source: 'getNotionDeliveryDataQualityOverview',
      label: 'Notion delivery data quality',
      severity: fromDataQualityStatus(aggregateStatus),
      summary,
      observedAt: overview.generatedAt,
      evidence
    },
    {
      signalId: 'delivery.data_quality.notion',
      moduleKey: 'delivery',
      kind: 'data_quality',
      source: 'getNotionDeliveryDataQualityOverview',
      label: 'Delivery freshness vs Notion source',
      severity: fromDataQualityStatus(aggregateStatus),
      summary: `${summary} (vista delivery)`,
      observedAt: overview.generatedAt,
      evidence
    }
  ]
}

const aggregateFailedCheckCounts = (
  spaces: IntegrationDataQualityOverview['latestBySpace']
): string => {
  const counts = new Map<string, number>()

  for (const space of spaces) {
    for (const check of space.failedChecks) {
      counts.set(check.checkKey, (counts.get(check.checkKey) ?? 0) + check.count)
    }
  }

  if (counts.size === 0) return ''

  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, count]) => `${key} (${count})`)
    .join(', ')
}

const formatCurrency = (cost: number, currency: string): string => {
  if (!Number.isFinite(cost)) return `${currency} —`

  const rounded = cost >= 100 ? Math.round(cost) : Math.round(cost * 100) / 100

  return `${currency} ${rounded.toLocaleString('en-US')}`
}

export const buildGcpBillingSignals = (overview: GcpBillingOverview): ReliabilitySignal[] => {
  const signals: ReliabilitySignal[] = []

  const baseEvidence = [
    {
      kind: 'sql' as const,
      label: 'Billing dataset',
      value: `${overview.source.dataset}${overview.source.table ? `.${overview.source.table}` : ''}`
    },
    {
      kind: 'helper' as const,
      label: 'Reader',
      value: 'src/lib/cloud/gcp-billing.ts:getGcpBillingOverview'
    }
  ]

  if (overview.availability !== 'configured') {
    const severity: ReliabilitySeverity =
      overview.availability === 'awaiting_data'
        ? 'awaiting_data'
        : overview.availability === 'not_configured'
          ? 'not_configured'
          : 'error'

    signals.push({
      signalId: 'cloud.billing.gcp_export',
      moduleKey: 'cloud',
      kind: 'billing',
      source: 'getGcpBillingOverview',
      label: 'GCP cost (Billing Export)',
      severity,
      summary:
        overview.error ??
        (overview.notes[0] ?? 'Billing Export no rinde datos todavía.'),
      observedAt: overview.generatedAt,
      evidence: baseEvidence
    })

    return signals
  }

  signals.push({
    signalId: 'cloud.billing.gcp_export',
    moduleKey: 'cloud',
    kind: 'billing',
    source: 'getGcpBillingOverview',
    label: `GCP cost (${overview.period.days} días)`,
    severity: (overview.topDrivers ?? []).some(driver => driver.severity === 'error')
      ? 'error'
      : (overview.topDrivers ?? []).some(driver => driver.severity === 'warning')
        ? 'warning'
        : 'ok',
    summary: `Total ${formatCurrency(overview.totalCost, overview.currency)} · forecast ${
      overview.forecast ? formatCurrency(overview.forecast.monthEndCost, overview.currency) : 'n/d'
    } · top servicio: ${
      overview.costByService[0]?.serviceDescription ?? 'n/d'
    }.`,
    observedAt: overview.generatedAt,
    evidence: [
      ...baseEvidence,
      ...(overview.forecast
        ? [
            {
              kind: 'metric' as const,
              label: 'Forecast mensual',
              value: formatCurrency(overview.forecast.monthEndCost, overview.currency)
            }
          ]
        : [])
    ]
  })

  for (const driver of overview.topDrivers ?? []) {
    if (driver.severity === 'ok') continue

    signals.push({
      signalId: `cloud.billing.driver.${driver.driverId}`,
      moduleKey: 'cloud',
      kind: 'billing',
      source: 'getGcpBillingOverview',
      label: `Cost driver: ${driver.serviceDescription}`,
      severity: driver.severity,
      summary: driver.summary,
      observedAt: overview.generatedAt,
      evidence: [
        ...baseEvidence,
        {
          kind: 'metric',
          label: 'Threshold',
          value: driver.threshold
        },
        {
          kind: 'metric',
          label: 'Share',
          value: `${driver.share}%`
        },
        ...driver.evidence.map(item => ({
          kind: 'metric' as const,
          label: item.label,
          value: item.value
        }))
      ]
    })
  }

  const notion = overview.spotlights.notionBqSync

  if (notion && notion.detectionStrategy !== 'unavailable') {
    signals.push({
      signalId: 'integrations.notion.billing.notion_bq_sync',
      moduleKey: 'integrations.notion',
      kind: 'billing',
      source: 'getGcpBillingOverview',
      label: 'Costo notion-bq-sync',
      severity: notion.detected ? 'ok' : 'awaiting_data',
      summary: notion.detected
        ? `${formatCurrency(notion.cost, overview.currency)} (${notion.share}% del total cloud).`
        : `Aproximación vía Cloud Run/Logging/Monitoring · ${formatCurrency(notion.cost, overview.currency)}.`,
      observedAt: overview.generatedAt,
      evidence: [
        ...baseEvidence,
        {
          kind: 'metric',
          label: 'detectionStrategy',
          value: notion.detectionStrategy
        }
      ]
    })
  }

  return signals
}

export const buildNotionFreshnessSignal = (
  overview: NotionSyncOperationalOverview
): ReliabilitySignal => {
  const severity: ReliabilitySeverity =
    overview.flowStatus === 'healthy'
      ? 'ok'
      : overview.flowStatus === 'degraded'
        ? 'warning'
        : overview.flowStatus === 'broken'
          ? 'error'
          : overview.flowStatus === 'awaiting_data'
            ? 'awaiting_data'
            : 'unknown'

  return {
    signalId: 'integrations.notion.freshness.upstream',
    moduleKey: 'integrations.notion',
    kind: 'freshness',
    source: 'getNotionSyncOperationalOverview',
    label: 'Notion upstream freshness',
    severity,
    summary: overview.summary,
    observedAt: overview.upstream.freshestRawSyncedAt ?? overview.generatedAt,
    evidence: [
      {
        kind: 'helper',
        label: 'Composer',
        value: 'src/lib/integrations/notion-sync-operational-overview.ts'
      },
      {
        kind: 'sql',
        label: 'Source',
        value: 'notion_ops.{tareas,proyectos,sprints}._synced_at'
      },
      {
        kind: 'metric',
        label: 'ageHours',
        value: overview.upstream.ageHours === null ? 'n/d' : String(overview.upstream.ageHours)
      }
    ]
  }
}

/**
 * TASK-632 — Synthetic monitoring adapters.
 *
 * Cada `SyntheticRouteSnapshot` (última probe por módulo+ruta) emite una señal
 * `kind=runtime` específica para esa ruta. Adicionalmente, un agregado por
 * módulo `kind=test_lane` resume "qué tan saludable está el set de rutas
 * críticas del módulo" — útil para boundary del Reliability Control Plane.
 */
const synthSeverityFromProbe = (probe: SyntheticRouteSnapshot['lastProbe']): ReliabilitySeverity => {
  if (probe.ok) return 'ok'

  if (probe.httpStatus === 0) return 'error'
  if (probe.httpStatus >= 500) return 'error'
  if (probe.httpStatus >= 400) return 'warning'

  return 'warning'
}

const slugForRoute = (path: string) =>
  path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'root'

export const buildSyntheticRouteSignals = (
  snapshots: SyntheticRouteSnapshot[]
): ReliabilitySignal[] => {
  if (snapshots.length === 0) return []

  return snapshots.map<ReliabilitySignal>(snapshot => {
    const probe = snapshot.lastProbe
    const severity = synthSeverityFromProbe(probe)

    const summaryParts = [
      probe.ok ? 'GET ok' : `GET ${probe.httpStatus || 'failed'}`,
      `${probe.latencyMs} ms`,
      probe.errorMessage ? probe.errorMessage.slice(0, 100) : null
    ].filter(Boolean) as string[]

    return {
      signalId: `${snapshot.moduleKey}.runtime.synthetic.${slugForRoute(snapshot.routePath)}`,
      moduleKey: snapshot.moduleKey,
      kind: 'runtime',
      source: 'runReliabilitySyntheticSweep',
      label: `Synthetic: ${snapshot.routePath}`,
      severity,
      summary: summaryParts.join(' · '),
      observedAt: probe.finishedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Synthetic runner',
          value: 'src/lib/reliability/synthetic/runner.ts'
        },
        {
          kind: 'sql',
          label: 'Probe table',
          value: 'greenhouse_sync.reliability_synthetic_runs'
        },
        {
          kind: 'metric',
          label: 'http_status',
          value: String(probe.httpStatus)
        }
      ]
    }
  })
}

const SEVERITY_RANK_FOR_AGGREGATE: Record<ReliabilitySeverity, number> = {
  ok: 0,
  awaiting_data: 1,
  unknown: 2,
  not_configured: 3,
  warning: 4,
  error: 5
}

export const buildSyntheticModuleSignals = (
  snapshots: SyntheticRouteSnapshot[]
): ReliabilitySignal[] => {
  if (snapshots.length === 0) return []

  const grouped = new Map<ReliabilityModuleKey, SyntheticRouteSnapshot[]>()

  for (const snapshot of snapshots) {
    const list = grouped.get(snapshot.moduleKey) ?? []

    list.push(snapshot)
    grouped.set(snapshot.moduleKey, list)
  }

  return Array.from(grouped.entries()).map<ReliabilitySignal>(([moduleKey, items]) => {
    let worstRank = 0

    for (const item of items) {
      const rank = SEVERITY_RANK_FOR_AGGREGATE[synthSeverityFromProbe(item.lastProbe)]

      if (rank > worstRank) worstRank = rank
    }

    const severity =
      (Object.entries(SEVERITY_RANK_FOR_AGGREGATE).find(([, rank]) => rank === worstRank)?.[0] as ReliabilitySeverity) ??
      'ok'

    const okCount = items.filter(item => item.lastProbe.ok).length
    const failCount = items.length - okCount

    const lastObservedAt = items
      .map(item => item.lastProbe.finishedAt)
      .sort()
      .at(-1) ?? null

    return {
      signalId: `${moduleKey}.test_lane.synthetic`,
      moduleKey,
      kind: 'test_lane',
      source: 'runReliabilitySyntheticSweep',
      label: 'Synthetic route lane',
      severity,
      summary:
        failCount === 0
          ? `${okCount} ruta${okCount === 1 ? '' : 's'} sana${okCount === 1 ? '' : 's'} en última corrida.`
          : `${failCount} ruta${failCount === 1 ? '' : 's'} en error de ${items.length}.`,
      observedAt: lastObservedAt,
      evidence: [
        {
          kind: 'helper',
          label: 'Synthetic runner',
          value: 'src/lib/reliability/synthetic/runner.ts'
        },
        {
          kind: 'metric',
          label: 'routes',
          value: `${okCount}/${items.length} ok`
        }
      ]
    }
  })
}

/**
 * TASK-599 — Finance preventive test lane adapter.
 *
 * Convierte el último resultado del smoke lane Finance en señales
 * `kind=test_lane` para el módulo `finance`. Emite:
 *  - 1 señal agregada `finance.test_lane.smoke` (estado del lane).
 *  - 0..N señales por suite individual cuando hay fallas, para que el
 *    Admin Center muestre cuál spec está en error sin perder detalle.
 *
 * Si `availability !== 'configured'`, emite solo la señal agregada con
 * severidad `awaiting_data` o `error` según corresponda — la UI degrada
 * con honestidad sin enmascarar regresiones.
 */
export const buildFinanceSmokeLaneSignals = (status: FinanceSmokeLaneStatus): ReliabilitySignal[] => {
  if (status.availability !== 'configured') {
    const severity: ReliabilitySeverity = status.availability === 'error' ? 'error' : 'awaiting_data'

    return [
      {
        signalId: 'finance.test_lane.smoke',
        moduleKey: 'finance',
        kind: 'test_lane',
        source: 'getFinanceSmokeLaneStatus',
        label: 'Finance smoke lane',
        severity,
        summary: status.error ?? status.notes[0] ?? 'Smoke lane Finance sin datos todavía.',
        observedAt: status.generatedAt,
        evidence: [
          {
            kind: 'helper',
            label: 'Smoke lane reader',
            value: 'src/lib/reliability/finance/get-finance-smoke-lane-status.ts'
          },
          {
            kind: 'doc',
            label: 'Lane spec',
            value: 'docs/operations/PLAYWRIGHT_E2E.md'
          }
        ]
      }
    ]
  }

  const aggregateSeverity: ReliabilitySeverity = status.totals.failed > 0 ? 'error' : 'ok'

  const aggregateSummary =
    status.totals.failed === 0
      ? `${status.totals.passed} de ${status.totals.total} specs Finance pasaron.`
      : `${status.totals.failed} spec${status.totals.failed === 1 ? '' : 's'} Finance en falla.`

  const baseEvidence = [
    {
      kind: 'helper' as const,
      label: 'Smoke lane reader',
      value: 'src/lib/reliability/finance/get-finance-smoke-lane-status.ts'
    },
    {
      kind: 'run' as const,
      label: 'Última corrida',
      value: status.reportFinishedAt ?? status.generatedAt
    }
  ]

  const aggregate: ReliabilitySignal = {
    signalId: 'finance.test_lane.smoke',
    moduleKey: 'finance',
    kind: 'test_lane',
    source: 'getFinanceSmokeLaneStatus',
    label: 'Finance smoke lane',
    severity: aggregateSeverity,
    summary: aggregateSummary,
    observedAt: status.reportFinishedAt ?? status.generatedAt,
    evidence: baseEvidence
  }

  const failingSuiteSignals: ReliabilitySignal[] = status.suites
    .filter(suite => suite.status === 'failed')
    .map(suite => ({
      signalId: `finance.test_lane.smoke.${suite.spec.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      moduleKey: 'finance',
      kind: 'test_lane',
      source: 'getFinanceSmokeLaneStatus',
      label: `Smoke fallido: ${suite.title}`,
      severity: 'error',
      summary: suite.errorMessage ?? `Spec ${suite.spec} en falla.`,
      observedAt: status.reportFinishedAt ?? status.generatedAt,
      evidence: [
        ...baseEvidence,
        {
          kind: 'test',
          label: 'Spec',
          value: suite.spec
        }
      ]
    }))

  return [aggregate, ...failingSuiteSignals]
}

export const SIGNAL_KIND_LABELS: Record<ReliabilitySignalKind, string> = {
  runtime: 'Runtime check',
  posture: 'Posture',
  incident: 'Incidente',
  freshness: 'Freshness',
  data_quality: 'Data quality',
  cost_guard: 'Cost guard',
  subsystem: 'Subsistema',
  test_lane: 'Test lane',
  billing: 'Billing',
  ai_summary: 'AI summary',
  // TASK-765 Slice 7
  drift: 'Drift',
  dead_letter: 'Dead-letter',
  lag: 'Lag'
}

/**
 * TASK-765 Slice 7 — Payment Order ↔ Bank Settlement signals.
 *
 * Wraps the 3 readers in `src/lib/reliability/queries/` so the composer can
 * inject them into `buildReliabilityOverview`. Each reader handles its own
 * try/catch and returns a degraded signal (kind=unknown) instead of throwing
 * — so a failure in one DB query never poisons the whole overview.
 *
 * Lives behind `Promise.all` to avoid sequential N+1 latency on /admin/operations.
 */
export const buildPaymentOrderSettlementSignals = async (
  readers: {
    paidWithoutExpensePayment: () => Promise<ReliabilitySignal>
    deadLetter: () => Promise<ReliabilitySignal>
    materializationLag: () => Promise<ReliabilitySignal>
  }
): Promise<ReliabilitySignal[]> => {
  const [paid, dead, lag] = await Promise.all([
    readers.paidWithoutExpensePayment(),
    readers.deadLetter(),
    readers.materializationLag()
  ])

  return [paid, dead, lag]
}

/**
 * TASK-766 Slice 2 — Finance CLP currency drift signals.
 *
 * Wraps los 2 readers de drift CLP (expense_payments + income_payments) en
 * un Promise.all para evitar latencia secuencial. Cada reader degrada
 * honestamente (severity=unknown) si su query falla.
 *
 * Mismo pattern que `buildPaymentOrderSettlementSignals` (TASK-765 Slice 7).
 */
export const buildFinanceClpDriftSignals = async (
  readers: {
    expensePayments: () => Promise<ReliabilitySignal>
    incomePayments: () => Promise<ReliabilitySignal>
  }
): Promise<ReliabilitySignal[]> => {
  const [expense, income] = await Promise.all([
    readers.expensePayments(),
    readers.incomePayments()
  ])

  return [expense, income]
}

/**
 * TASK-768 Slice 7 — builder canonico de signals "economic_category_unresolved"
 * para expenses + income. Mismo patron que buildFinanceClpDriftSignals.
 * Subsystem rollup: finance_data_quality.
 */
export const buildFinanceEconomicCategoryUnresolvedSignals = async (
  readers: {
    expenses: () => Promise<ReliabilitySignal>
    income: () => Promise<ReliabilitySignal>
  }
): Promise<ReliabilitySignal[]> => {
  const [expenses, income] = await Promise.all([readers.expenses(), readers.income()])

  return [expenses, income]
}

/**
 * TASK-777 — Expense distribution signals.
 *
 * Deterministic gates for the management-accounting distribution layer:
 * unresolved canonical distributions and legacy shared-pool contamination.
 * These signals protect P&L consumers before we cut them over from legacy
 * `expenses.cost_category` heuristics to `expense_distribution_resolution`.
 */
export const buildExpenseDistributionSignals = async (
  readers: {
    unresolved: () => Promise<ReliabilitySignal>
    sharedPoolContamination: () => Promise<ReliabilitySignal>
  }
): Promise<ReliabilitySignal[]> => {
  const [unresolved, contamination] = await Promise.all([
    readers.unresolved(),
    readers.sharedPoolContamination()
  ])

  return [unresolved, contamination]
}
