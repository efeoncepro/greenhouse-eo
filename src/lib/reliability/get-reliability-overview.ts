import 'server-only'

import type { CloudSentryIncidentsSnapshot } from '@/lib/cloud/contracts'
import { getCloudSentryIncidents } from '@/lib/cloud/observability'
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

import { buildAiSummarySignals } from './ai/build-ai-summary-signals'
import { getLatestAiObservationsByScope, type AiObservation } from './ai/reader'
import { getAccountBalancesFxDriftSignal } from './queries/account-balances-fx-drift'
import {
  getExpenseDistributionSharedPoolContaminationSignal,
  getExpenseDistributionUnresolvedSignal
} from './queries/expense-distribution'
import { getExpensePaymentsClpDriftSignal } from './queries/expense-payments-clp-drift'
import { getIncomePaymentsClpDriftSignal } from './queries/income-payments-clp-drift'
import { getPaymentOrdersDeadLetterSignal } from './queries/payment-orders-dead-letter'
import { getPaidOrdersWithoutExpensePaymentSignal } from './queries/payment-orders-paid-without-expense-payment'
import { getPayrollExpenseMaterializationLagSignal } from './queries/payroll-expense-materialization-lag'
import { getProviderBqSyncDeadLetterSignal } from './queries/provider-bq-sync-dead-letter'
import { getOutboxUnpublishedLagSignal } from './queries/outbox-unpublished-lag'
import { getOutboxDeadLetterSignal } from './queries/outbox-dead-letter'
import { getCronStagingDriftSignal } from './queries/cron-staging-drift'
import { RELIABILITY_REGISTRY } from './registry'
import { getReliabilityRegistry } from './registry-store'
import {
  aggregateModuleStatus,
  computeConfidence,
  isConcreteSeverity
} from './severity'
import {
  buildCloudSignals,
  buildDomainIncidentSignals,
  buildFinanceSmokeLaneSignals,
  buildGcpBillingSignals,
  buildNotionDataQualitySignals,
  buildNotionFreshnessSignal,
  buildObservabilityPostureSignal,
  buildFinanceClpDriftSignals,
  buildExpenseDistributionSignals,
  buildPaymentOrderSettlementSignals,
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
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'finance',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'integrations.notion',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'cloud',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
  },
  {
    taskId: 'TASK-638',
    moduleKey: 'delivery',
    expectedSignalKind: 'ai_summary',
    expectedSource: 'reliability_ai_observer',
    status: 'ready',
    note: 'TASK-638 entregó AI Observer (Gemini Flash via Vertex AI) hosted en ops-worker + Cloud Scheduler. Adapter: buildAiSummarySignals. Default OFF (kill-switch RELIABILITY_AI_OBSERVER_ENABLED).'
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

  /**
   * TASK-638: AI Observer observations. Opt-in para evitar feedback loop
   * con el runner — cuando este source es undefined, NO se inyectan signals
   * `ai_summary`. El runner pasa `aiObservations: null` explícitamente para
   * pedir al composer "no inyectes" (signal de intención clara). El consumer
   * de UI (Admin Center) pasa las observations leídas desde la DB.
   */
  aiObservations?: {
    overview: AiObservation | null
    byModule: Record<string, AiObservation>
  } | null

  /**
   * Per-module Sentry incident snapshots, keyed by `moduleKey`. Populated by
   * the consumer (admin reliability page / cron AI watcher) by iterating the
   * registry's `incidentDomainTag` and calling `getCloudSentryIncidents({
   * domain })` once per tag. Kept opt-in so background watchers and tests
   * don't accidentally hammer the Sentry API.
   */
  domainIncidents?: Record<string, CloudSentryIncidentsSnapshot> | null

  /**
   * TASK-765 Slice 7 — payment_order ↔ bank settlement signals. 3 readers
   * que cuentan drift / dead_letter / lag para el path payroll → expense →
   * payment_order. Cada reader degrada honestamente (kind=unknown) si la
   * query falla. El composer los inyecta en `allSignals` con resto del array.
   */
  paymentOrderSettlement?: ReliabilitySignal[] | null

  /**
   * TASK-766 Slice 2 — Finance CLP currency drift signals. 2 readers que
   * cuentan expense_payments / income_payments con currency!='CLP' y
   * amount_clp IS NULL (drift detectado por la VIEW *_normalized via flag
   * has_clp_drift). Cada reader degrada honestamente (kind=unknown) si la
   * query falla. Steady state esperado = 0; cualquier valor > 0 indica una
   * fila legacy pendiente del repair endpoint
   * `POST /api/admin/finance/payments-clp-repair` (slice 5).
   */
  financeClpDrift?: ReliabilitySignal[] | null

  /**
   * TASK-771 Slice 4 — Provider BQ sync dead-letter signal. Cuenta entries en
   * outbox_reactive_log para handler `provider_bq_sync:provider.upserted` que
   * llegaron a dead-letter (la projection canónica que sincroniza
   * greenhouse_core.providers PG → greenhouse.providers BQ). Steady state
   * esperado = 0; >0 indica drift PG↔BQ activo (AI Tooling y consumers BQ
   * verán datos stale hasta resolver). Mismo patrón que paymentOrderSettlement.
   */
  providerBqSyncDeadLetter?: ReliabilitySignal[] | null

  /**
   * TASK-773 Slice 4 — Outbox publisher health. 2 readers:
   *   - sync.outbox.unpublished_lag (events pending/failed > 10 min)
   *   - sync.outbox.dead_letter (events agotaron retries, requieren humano)
   * Steady state = 0 ambos. Si > 0, el event bus está roto y NINGUNA projection
   * corre — toda actualización async finance queda colgada (root cause del
   * incidente Figma 2026-05-03 cuando Vercel cron no corría en staging).
   */
  outboxHealth?: ReliabilitySignal[] | null

  /**
   * TASK-775 Slice 5 — Cron staging drift signal:
   *   - platform.cron.staging_drift (Vercel async-critical sin Cloud Scheduler)
   * Steady state = 0. Si > 0, hay crons que no corren en staging (Vercel
   * custom environments NO ejecutan crons). Detecta la clase de bugs invisibles
   * que motivó TASK-773 y TASK-775.
   */
  cronStagingDrift?: ReliabilitySignal | null

  /**
   * TASK-774 Slice 4 — Account balances FX drift signal:
   *   - finance.account_balances.fx_drift (closing_balance vs recompute desde
   *     VIEWs canónicas TASK-766)
   * Steady state = 0. Si > 0, materializer corrió antes del fix TASK-774
   * o emerge nuevo callsite con anti-patrón SUM(payment.amount) sin _clp.
   * Bug Figma EXP-202604-008 (2026-05-03).
   */
  accountBalancesFxDrift?: ReliabilitySignal | null

  /**
   * TASK-777 Slice 3 — Expense distribution management-accounting gates.
   * Protege P&L/overhead: cuenta expenses sin lane canónico y filas que el
   * pool legacy tomaría como overhead aunque son payroll provider, regulatorio
   * o costos financieros. Steady state = 0 antes de cerrar períodos.
   */
  expenseDistribution?: ReliabilitySignal[] | null
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
    ...(sources.financeSmokeLane ? buildFinanceSmokeLaneSignals(sources.financeSmokeLane) : []),
    // TASK-2026-04-26 — per-module incident signals via Sentry domain tag.
    // Iterates the registry's `incidentDomainTag` entries and projects one
    // `incident` signal per module from the domain-filtered Sentry feed.
    // Closes the `expectedSignalKinds: ['incident']` gap for finance,
    // delivery, integrations.notion (cloud already had a global signal).
    ...(sources.domainIncidents ? buildDomainIncidentSignals(sources.domainIncidents) : []),
    ...(sources.aiObservations ? buildAiSummarySignals(sources.aiObservations.byModule) : []),
    // TASK-765 Slice 7 — payment_order ↔ bank settlement signals (drift /
    // dead_letter / lag). Inyectadas pre-fetched desde getReliabilityOverview
    // para mantener buildReliabilityOverview sincrónico.
    ...(sources.paymentOrderSettlement ?? []),
    // TASK-766 Slice 2 — Finance CLP currency drift signals (expense + income).
    ...(sources.financeClpDrift ?? []),
    // TASK-771 Slice 4 — Provider BQ sync dead-letter signal (drift PG↔BQ).
    ...(sources.providerBqSyncDeadLetter ?? []),
    // TASK-773 Slice 4 — Outbox publisher health (lag + dead_letter).
    ...(sources.outboxHealth ?? []),
    // TASK-775 Slice 5 — Vercel ↔ Cloud Scheduler drift (async-critical crons).
    ...(sources.cronStagingDrift ? [sources.cronStagingDrift] : []),
    // TASK-774 Slice 4 — Account balances FX drift (closing_balance vs recompute).
    ...(sources.accountBalancesFxDrift ? [sources.accountBalancesFxDrift] : []),
    // TASK-777 Slice 3 — Expense distribution gates.
    ...(sources.expenseDistribution ?? [])
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
  options: { spaceId?: string | null; includeAiObservations?: boolean } = {}
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

  /**
   * TASK-638: AI observations son opt-in. Default OFF — el runner del AI
   * Observer NO debe ver señales `ai_summary` previas (evita feedback loop).
   * El consumer de UI (Admin Center page) pasa `includeAiObservations=true`.
   * Si el caller ya pasó `aiObservations` en preloadedSources, se respeta.
   */
  const aiObservations =
    preloadedSources.aiObservations !== undefined
      ? preloadedSources.aiObservations
      : options.includeAiObservations
        ? await getLatestAiObservationsByScope().catch(() => null)
        : null

  // Per-module Sentry incidents via the `domain` tag. Iterates the registry's
  // `incidentDomainTag` entries and queries Sentry once per tag in parallel.
  // Catches per-domain to ensure a single failure doesn't poison the whole
  // overview. Skipped when caller pre-provides `domainIncidents` (admin/AI
  // observer paths that already have the data) or when there are no modules
  // declaring an incident tag.
  const domainIncidents = preloadedSources.domainIncidents !== undefined
    ? preloadedSources.domainIncidents
    : await hydrateDomainIncidents(modules ?? RELIABILITY_REGISTRY)

  // TASK-765 Slice 7 — payment_order ↔ bank settlement signals (drift /
  // dead_letter / lag). Cada reader degrada honestamente (severity=unknown)
  // si su query falla — un solo signal roto NO envenena el overview entero.
  const paymentOrderSettlement =
    preloadedSources.paymentOrderSettlement !== undefined
      ? preloadedSources.paymentOrderSettlement
      : await buildPaymentOrderSettlementSignals({
          paidWithoutExpensePayment: getPaidOrdersWithoutExpensePaymentSignal,
          deadLetter: getPaymentOrdersDeadLetterSignal,
          materializationLag: getPayrollExpenseMaterializationLagSignal
        }).catch(() => null)

  // TASK-766 Slice 2 — Finance CLP currency drift signals (expense + income).
  const financeClpDrift =
    preloadedSources.financeClpDrift !== undefined
      ? preloadedSources.financeClpDrift
      : await buildFinanceClpDriftSignals({
          expensePayments: getExpensePaymentsClpDriftSignal,
          incomePayments: getIncomePaymentsClpDriftSignal
        }).catch(() => null)

  // TASK-771 Slice 4 — Provider BQ sync dead-letter signal (drift PG↔BQ).
  // Single signal pero envuelto en array para shape consistency con
  // paymentOrderSettlement / financeClpDrift. Degrada honestamente si la
  // query falla (severity=unknown) — un solo signal roto NO envenena el
  // overview entero.
  const providerBqSyncDeadLetter =
    preloadedSources.providerBqSyncDeadLetter !== undefined
      ? preloadedSources.providerBqSyncDeadLetter
      : await getProviderBqSyncDeadLetterSignal()
          .then(signal => [signal])
          .catch(() => null)

  // TASK-773 Slice 4 — Outbox publisher health (lag + dead_letter).
  // 2 readers en paralelo. Cada uno degrada honestamente si su query falla.
  // Critical signal: si el publisher está caído, NINGUNA projection corre.
  const outboxHealth =
    preloadedSources.outboxHealth !== undefined
      ? preloadedSources.outboxHealth
      : await Promise.all([
          getOutboxUnpublishedLagSignal().catch(() => null),
          getOutboxDeadLetterSignal().catch(() => null)
        ])
          .then(signals => signals.filter((s): s is NonNullable<typeof s> => s !== null))
          .catch(() => null)

  // TASK-775 Slice 5 — Cron staging drift (Vercel async-critical sin Cloud
  // Scheduler equivalent). Lee vercel.json + snapshot canónico de Cloud
  // Scheduler jobs. Degrada honestamente a `unknown` si vercel.json falla.
  const cronStagingDrift =
    preloadedSources.cronStagingDrift !== undefined
      ? preloadedSources.cronStagingDrift
      : await getCronStagingDriftSignal().catch(() => null)

  // TASK-774 Slice 4 — Account balances FX drift (closing_balance vs recompute
  // desde VIEWs canonicas TASK-766). Steady=0. Degrada honestamente a `unknown`.
  const accountBalancesFxDrift =
    preloadedSources.accountBalancesFxDrift !== undefined
      ? preloadedSources.accountBalancesFxDrift
      : await getAccountBalancesFxDriftSignal().catch(() => null)

  const expenseDistribution =
    preloadedSources.expenseDistribution !== undefined
      ? preloadedSources.expenseDistribution
      : await buildExpenseDistributionSignals({
          unresolved: getExpenseDistributionUnresolvedSignal,
          sharedPoolContamination: getExpenseDistributionSharedPoolContaminationSignal
        }).catch(() => null)

  return buildReliabilityOverview(operations, {
    billing,
    notionOperational,
    syntheticSnapshots,
    financeSmokeLane,
    modules,
    aiObservations,
    domainIncidents,
    paymentOrderSettlement,
    financeClpDrift,
    providerBqSyncDeadLetter,
    outboxHealth,
    cronStagingDrift,
    accountBalancesFxDrift,
    expenseDistribution
  })
}

/**
 * Fetch Sentry incident snapshots in parallel for every module whose registry
 * entry declares an `incidentDomainTag`. Failures are isolated per domain so a
 * Sentry hiccup on one module never poisons the others.
 */
const hydrateDomainIncidents = async (
  registry: ReliabilityModuleDefinition[]
): Promise<Record<string, CloudSentryIncidentsSnapshot> | null> => {
  const taggedModules = registry.filter(m => Boolean(m.incidentDomainTag))

  if (taggedModules.length === 0) return null

  const entries = await Promise.all(
    taggedModules.map(async module => {
      try {
        const snapshot = await getCloudSentryIncidents(process.env, {
          domain: module.incidentDomainTag ?? null
        })

        return [module.moduleKey, snapshot] as const
      } catch {
        return null
      }
    })
  )

  const out: Record<string, CloudSentryIncidentsSnapshot> = {}

  for (const entry of entries) {
    if (entry) out[entry[0]] = entry[1]
  }

  return Object.keys(out).length > 0 ? out : null
}
