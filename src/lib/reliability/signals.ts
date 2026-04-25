import type {
  CloudHealthCheck,
  CloudPostureCheck,
  CloudSentryIncidentsSnapshot,
  CloudObservabilityPosture
} from '@/lib/cloud/contracts'
import type {
  BlockedQueryEntry,
  CloudPlatformOverview,
  OperationsSubsystem
} from '@/lib/operations/get-operations-overview'
import type { IntegrationDataQualityOverview } from '@/types/integration-data-quality'
import type {
  ReliabilityModuleKey,
  ReliabilitySignal,
  ReliabilitySignalKind
} from '@/types/reliability'

import {
  fromCloudHealthStatus,
  fromCloudPostureStatus,
  fromDataQualityStatus,
  fromOperationsHealth,
  fromSentryLevel
} from './severity'

const MAX_SENTRY_INCIDENTS_PER_SIGNAL = 3

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
  'Finance Data Quality': 'finance'
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

    const summaryParts = [
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
      summary: summaryParts.join(' · '),
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
        }
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

  const top = snapshot.incidents.slice(0, MAX_SENTRY_INCIDENTS_PER_SIGNAL)

  return top.map(incident => ({
    signalId: `cloud.incident.sentry.${incident.shortId ?? incident.id}`,
    moduleKey: 'cloud',
    kind: 'incident',
    source: 'getCloudSentryIncidents',
    label: incident.shortId ? `Sentry ${incident.shortId}` : 'Sentry incident',
    severity: fromSentryLevel(incident.level),
    summary: `${incident.title} · ${incident.count} eventos · ${incident.userCount} usuarios`,
    observedAt: incident.lastSeen,
    evidence: incident.permalink
      ? [{ kind: 'incident', label: 'Sentry link', value: incident.permalink }]
      : [{ kind: 'incident', label: 'Sentry id', value: incident.id }]
  }))
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

  const aggregateStatus = overview.totals.brokenSpaces > 0
    ? 'broken'
    : overview.totals.degradedSpaces > 0 || overview.totals.unknownSpaces > 0
      ? 'degraded'
      : 'healthy'

  const summary = [
    `${overview.totals.totalSpaces} spaces`,
    `${overview.totals.healthySpaces} sanos`,
    overview.totals.degradedSpaces > 0 ? `${overview.totals.degradedSpaces} degradados` : null,
    overview.totals.brokenSpaces > 0 ? `${overview.totals.brokenSpaces} rotos` : null,
    overview.totals.unknownSpaces > 0 ? `${overview.totals.unknownSpaces} sin estado` : null
  ]
    .filter(Boolean)
    .join(' · ')

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

export const SIGNAL_KIND_LABELS: Record<ReliabilitySignalKind, string> = {
  runtime: 'Runtime check',
  posture: 'Posture',
  incident: 'Incidente',
  freshness: 'Freshness',
  data_quality: 'Data quality',
  cost_guard: 'Cost guard',
  subsystem: 'Subsistema',
  test_lane: 'Test lane',
  billing: 'Billing'
}
