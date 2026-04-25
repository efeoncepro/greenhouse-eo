import 'server-only'

import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { getNotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import type { NotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import {
  getOperationsOverview,
  type OperationsOverview
} from '@/lib/operations/get-operations-overview'
import { getFinanceSmokeLaneStatus } from '@/lib/reliability/finance/get-finance-smoke-lane-status'
import { getLatestSyntheticSnapshotsByRoute } from '@/lib/reliability/synthetic/reader'
import type { GcpBillingOverview } from '@/types/billing-export'
import type { FinanceSmokeLaneStatus } from '@/types/finance-smoke-lane'
import type {
  ReliabilityIntegrationBoundary,
  ReliabilityModuleDefinition,
  ReliabilityModuleSnapshot,
  ReliabilityOverview,
  ReliabilitySeverity,
  ReliabilitySignal,
  ReliabilitySignalKind
} from '@/types/reliability'
import type { SyntheticRouteSnapshot } from '@/types/reliability-synthetic'

import { RELIABILITY_REGISTRY } from './registry'
import { getReliabilityRegistry } from './registry-store'
import {
  aggregateModuleStatus,
  computeConfidence,
  isConcreteSeverity
} from './severity'
import {
  buildCloudSignals,
  buildFinanceSmokeLaneSignals,
  buildGcpBillingSignals,
  buildNotionDataQualitySignals,
  buildNotionFreshnessSignal,
  buildObservabilityPostureSignal,
  buildSentryIncidentSignals,
  buildSubsystemSignals,
  buildSyntheticModuleSignals,
  buildSyntheticRouteSignals
} from './signals'

const RELIABILITY_INTEGRATION_BOUNDARIES: ReliabilityIntegrationBoundary[] = [
  {
    taskId: 'TASK-586',
    moduleKey: 'cloud',
    expectedSignalKind: 'billing',
    expectedSource: 'getGcpBillingOverview',
    status: 'ready',
    note: 'TASK-586 entregó el reader Billing Export con degradación honesta (awaiting_data cuando tablas no rinden). Adapter: buildGcpBillingSignals.'
  },
  {
    taskId: 'TASK-586',
    moduleKey: 'integrations.notion',
    expectedSignalKind: 'freshness',
    expectedSource: 'getNotionSyncOperationalOverview',
    status: 'ready',
    note: 'TASK-586 entregó composer Notion sync end-to-end (raw + orchestration + DQ). Adapter: buildNotionFreshnessSignal.'
  },
  {
    taskId: 'TASK-599',
    moduleKey: 'finance',
    expectedSignalKind: 'test_lane',
    expectedSource: 'getFinanceSmokeLaneStatus',
    status: 'ready',
    note: 'TASK-599 entregó 3 smoke specs Playwright (clients, suppliers, expenses) + reader que parsea artifacts/playwright/results.json + adapter buildFinanceSmokeLaneSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'finance',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'integrations.notion',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'cloud',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-632',
    moduleKey: 'delivery',
    expectedSignalKind: 'runtime',
    expectedSource: 'runReliabilitySyntheticSweep',
    status: 'ready',
    note: 'TASK-632 entregó cron de synthetic monitoring. Adapter: buildSyntheticRouteSignals.'
  },
  {
    taskId: 'TASK-103',
    moduleKey: 'cloud',
    expectedSignalKind: 'billing',
    expectedSource: 'getGcpBudgetThresholdState',
    status: 'partial',
    note: 'TASK-103 todavía cubre solo cost guard runtime (kind=cost_guard). Budget thresholds 50/80/100% requieren GCP Console manual. La señal billing principal ya la cubre TASK-586.'
  }
]

const buildSummary = (
  status: ReliabilitySeverity,
  signalCounts: Record<ReliabilitySeverity, number>,
  missing: ReliabilitySignalKind[]
): string => {
  const concreteTotal = signalCounts.ok + signalCounts.warning + signalCounts.error

  if (signalCounts.error > 0) {
    return `${signalCounts.error} señal${signalCounts.error === 1 ? '' : 'es'} en error.`
  }

  if (signalCounts.warning > 0) {
    return `${signalCounts.warning} señal${signalCounts.warning === 1 ? '' : 'es'} en warning.`
  }

  if (concreteTotal === 0) {
    if (missing.length > 0) {
      return `Sin señales concretas. Pendiente plomar: ${missing.join(', ')}.`
    }

    return 'Sin señales activas todavía.'
  }

  if (status === 'ok') {
    return `${concreteTotal} señal${concreteTotal === 1 ? '' : 'es'} sanas.`
  }

  return `Estado: ${status}.`
}

const buildSignalCounts = (
  signals: ReliabilitySignal[]
): Record<ReliabilitySeverity, number> => {
  const counts: Record<ReliabilitySeverity, number> = {
    ok: 0,
    warning: 0,
    error: 0,
    unknown: 0,
    not_configured: 0,
    awaiting_data: 0
  }

  for (const signal of signals) {
    counts[signal.severity] += 1
  }

  return counts
}

const SIGNAL_SEVERITY_RANK: Record<ReliabilitySeverity, number> = {
  error: 0,
  warning: 1,
  not_configured: 2,
  unknown: 3,
  awaiting_data: 4,
  ok: 5
}

const sortSignalsForDisplay = (signals: ReliabilitySignal[]): ReliabilitySignal[] =>
  [...signals].sort((a, b) => SIGNAL_SEVERITY_RANK[a.severity] - SIGNAL_SEVERITY_RANK[b.severity])

interface ReliabilityOverviewSources {
  billing?: GcpBillingOverview | null
  notionOperational?: NotionSyncOperationalOverview | null
  syntheticSnapshots?: SyntheticRouteSnapshot[] | null
  financeSmokeLane?: FinanceSmokeLaneStatus | null

  /**
   * TASK-635: módulos efectivos resueltos para el tenant. Cuando se pasa,
   * el composer itera sobre este array (DB defaults + overlay overrides);
   * cuando es null/undefined, cae al `STATIC_RELIABILITY_REGISTRY` para
   * mantener compatibilidad pre-635.
   */
  modules?: ReliabilityModuleDefinition[] | null
}

export const buildReliabilityOverview = (
  operations: OperationsOverview,
  sources: ReliabilityOverviewSources = {}
): ReliabilityOverview => {
  const syntheticSnapshots = sources.syntheticSnapshots ?? []

  const effectiveModules = sources.modules && sources.modules.length > 0
    ? sources.modules
    : RELIABILITY_REGISTRY

  const allSignals: ReliabilitySignal[] = [
    ...buildSubsystemSignals(operations.subsystems),
    ...buildCloudSignals(operations.cloud),
    ...buildSentryIncidentSignals(operations.cloud.observability.incidents),
    buildObservabilityPostureSignal(operations.cloud.observability.posture),
    ...buildNotionDataQualitySignals(operations.notionDeliveryDataQuality ?? null),
    ...(sources.billing ? buildGcpBillingSignals(sources.billing) : []),
    ...(sources.notionOperational ? [buildNotionFreshnessSignal(sources.notionOperational)] : []),
    ...buildSyntheticRouteSignals(syntheticSnapshots),
    ...buildSyntheticModuleSignals(syntheticSnapshots),
    ...(sources.financeSmokeLane ? buildFinanceSmokeLaneSignals(sources.financeSmokeLane) : [])
  ]

  const signalsByModule = new Map<string, ReliabilitySignal[]>()

  for (const signal of allSignals) {
    const list = signalsByModule.get(signal.moduleKey) ?? []

    list.push(signal)
    signalsByModule.set(signal.moduleKey, list)
  }

  const modules: ReliabilityModuleSnapshot[] = effectiveModules.map(definition => {
    const signals = sortSignalsForDisplay(signalsByModule.get(definition.moduleKey) ?? [])

    const observedKinds = new Set(signals.map(signal => signal.kind))
    const missing = definition.expectedSignalKinds.filter(kind => !observedKinds.has(kind))

    const status = aggregateModuleStatus(signals)
    const signalCounts = buildSignalCounts(signals)

    const concreteCount = signals.filter(signal => isConcreteSeverity(signal.severity)).length

    const confidence = computeConfidence(
      Math.max(definition.expectedSignalKinds.length, 1),
      observedKinds.size,
      concreteCount
    )

    return {
      moduleKey: definition.moduleKey,
      label: definition.label,
      description: definition.description,
      domain: definition.domain,
      status,
      confidence,
      summary: buildSummary(status, signalCounts, missing),
      routes: definition.routes,
      apis: definition.apis,
      dependencies: definition.dependencies,
      smokeTests: definition.smokeTests,
      signals,
      signalCounts,
      expectedSignalKinds: definition.expectedSignalKinds,
      missingSignalKinds: missing
    }
  })

  const totals = modules.reduce(
    (acc, module) => {
      acc.totalModules += 1

      if (module.status === 'ok') acc.healthy += 1
      else if (module.status === 'warning') acc.warning += 1
      else if (module.status === 'error') acc.error += 1
      else acc.unknownOrPending += 1

      return acc
    },
    { totalModules: 0, healthy: 0, warning: 0, error: 0, unknownOrPending: 0 }
  )

  const notes: string[] = []

  if (totals.unknownOrPending > 0) {
    notes.push(
      `${totals.unknownOrPending} módulo${totals.unknownOrPending === 1 ? '' : 's'} sin señal concreta — revisar boundaries de TASK-586/TASK-599.`
    )
  }

  if (operations.cloud.observability.incidents.status === 'unconfigured') {
    notes.push('Sentry incident reader no configurado — `cloud.incident` queda como not_configured.')
  }

  return {
    generatedAt: new Date().toISOString(),
    modules,
    totals,
    integrationBoundaries: RELIABILITY_INTEGRATION_BOUNDARIES,
    notes
  }
}

/**
 * Reader consolidado de confiabilidad. Reusa `getOperationsOverview()` como
 * agregador operativo. Si el caller ya tiene el overview (ej: la página de
 * Admin Center), debe pasarlo para evitar el doble fetch.
 *
 * Las fuentes adicionales (`billing`, `notionOperational`) son opcionales:
 * cuando no se pasan, se hace fetch adicional con tolerancia a fallos
 * (ningún error individual rompe la lectura consolidada).
 */
export const getReliabilityOverview = async (
  preloadedOperations?: OperationsOverview,
  preloadedSources: ReliabilityOverviewSources = {},
  options: { spaceId?: string | null } = {}
): Promise<ReliabilityOverview> => {
  const operations = preloadedOperations ?? (await getOperationsOverview())

  const billing =
    preloadedSources.billing !== undefined
      ? preloadedSources.billing
      : await getGcpBillingOverview().catch(() => null)

  const notionOperational =
    preloadedSources.notionOperational !== undefined
      ? preloadedSources.notionOperational
      : await getNotionSyncOperationalOverview().catch(() => null)

  const syntheticSnapshots =
    preloadedSources.syntheticSnapshots !== undefined
      ? preloadedSources.syntheticSnapshots
      : await getLatestSyntheticSnapshotsByRoute().catch(() => [])

  const financeSmokeLane =
    preloadedSources.financeSmokeLane !== undefined
      ? preloadedSources.financeSmokeLane
      : await getFinanceSmokeLaneStatus().catch(() => null)

  // TASK-635: módulos efectivos resueltos por el store DB-aware. Si no se
  // pasa preloaded.modules, el store consulta DB defaults + overlay overrides
  // para `options.spaceId`. Fallback a STATIC_RELIABILITY_REGISTRY si DB falla.
  const modules: ReliabilityModuleDefinition[] | null =
    preloadedSources.modules !== undefined
      ? preloadedSources.modules
      : await getReliabilityRegistry(options.spaceId ?? null)

  return buildReliabilityOverview(operations, {
    billing,
    notionOperational,
    syntheticSnapshots,
    financeSmokeLane,
    modules
  })
}
