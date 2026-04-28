import 'server-only'

import { getBlockedQueries, getBigQueryProjectId } from '@/lib/bigquery'
import { getBigQueryMaximumBytesBilled } from '@/lib/cloud/bigquery'
import type { CloudHealthSnapshot } from '@/lib/cloud/contracts'
import { getCronSecretState } from '@/lib/cloud/cron'
import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'
import { buildCloudHealthSnapshot, getCloudPlatformHealthSnapshot } from '@/lib/cloud/health'
import { getCloudObservabilityPosture, getCloudSentryIncidents } from '@/lib/cloud/observability'
import { getCloudPostgresPosture } from '@/lib/cloud/postgres'
import { readAiLlmOperationsSnapshot } from '@/lib/ico-engine/ai/llm-enrichment-reader'
import { getNotionDeliveryDataQualityOverview } from '@/lib/integrations/notion-delivery-data-quality'
import { countIncomesWithSettlementDrift } from '@/lib/finance/income-settlement'
import { readReactiveBacklogOverview, type ReactiveBacklogOverview } from '@/lib/operations/reactive-backlog'
import { getLastReactiveRun } from '@/lib/sync/reactive-run-tracker'
import {
  getGreenhousePostgresConfig,
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery
} from '@/lib/postgres/client'
import type { IntegrationDataQualityOverview } from '@/types/integration-data-quality'

export interface OperationsKpis {
  outboxEvents24h: number
  pendingProjections: number
  hiddenReactiveBacklog: number
  notificationsSent24h: number
  activeSyncs: number
  failedHandlers: number
}

export type OperationsHealthStatus = 'healthy' | 'degraded' | 'down' | 'not_configured' | 'idle'

export type OperationsMetricStatus = 'ok' | 'warning' | 'error' | 'info'

export interface OperationsSubsystemMetric {
  key: string
  label: string
  value: number
  status: OperationsMetricStatus
}

export interface OperationsSubsystem {
  name: string
  status: OperationsHealthStatus
  processed: number
  failed: number
  lastRun: string | null
  summary?: string | null
  metrics?: OperationsSubsystemMetric[]
}

export interface OperationsRecentEvent {
  eventType: string
  aggregateType: string
  aggregateId: string
  occurredAt: string
  status: string
}

export interface OperationsFailedProjection {
  projectionName: string
  entityType: string
  entityId: string
  failedAt: string
  errorMessage: string
  errorClass: string | null
  isInfrastructure: boolean
}

export interface OperationsFailedHandler {
  handler: string
  result: string
  retries: number
  reactedAt: string
  lastError: string
  errorClass: string | null
  isInfrastructure: boolean
}

export interface OperationsWebhookOverview {
  endpointsActive: number
  subscriptionsActive: number
  inboxReceived24h: number
  inboxFailed24h: number
  deliveriesPending: number
  deliveriesRetryScheduled: number
  deliveriesDeadLetter: number
  secretRefsRegistered: number
  secretRefs: Array<{
    secretRef: string
    sourceKind: 'endpoint' | 'subscription'
    authMode: string | null
  }>
  lastInboxAt: string | null
  lastDeliveryAt: string | null
  schemaReady: boolean
}

export interface OperationsOverview {
  kpis: OperationsKpis
  reactiveBacklog: ReactiveBacklogOverview
  subsystems: OperationsSubsystem[]
  recentEvents: OperationsRecentEvent[]
  failedProjections: OperationsFailedProjection[]
  failedHandlers: OperationsFailedHandler[]
  webhooks: OperationsWebhookOverview
  notionDeliveryDataQuality?: IntegrationDataQualityOverview | null
  cloud: CloudPlatformOverview
}

export interface BlockedQueryEntry {
  query: string
  limit: string
  timestamp: string
}

export interface CloudPlatformOverview {
  health: CloudHealthSnapshot
  posture: {
    overallStatus: 'ok' | 'warning' | 'failed'
    controls: CloudPlatformControl[]
  }
  auth: {
    mode: 'wif' | 'service_account_key' | 'mixed' | 'unconfigured'
    summary: string
  }
  cron: {
    secretConfigured: boolean
    summary: string
  }
  postgres: {
    configured: boolean
    usesConnector: boolean
    sslEnabled: boolean
    maxConnections: number
    summary: string
  }
  bigquery: {
    projectId: string | null
    maximumBytesBilled: number
    summary: string
    blockedQueries: BlockedQueryEntry[]
  }
  observability: {
    posture: Awaited<ReturnType<typeof getCloudObservabilityPosture>>
    incidents: Awaited<ReturnType<typeof getCloudSentryIncidents>>
  }
}

export interface CloudPlatformControl {
  key: 'postgres' | 'bigquery' | 'cron' | 'cost_guard' | 'gcp_auth'
  label: string
  status: 'ok' | 'warning' | 'failed'
  summary: string
  details?: Record<string, unknown>
}

interface CountRow extends Record<string, unknown> {
  cnt: string | number
}

interface FinanceAllocationCountsRow extends Record<string, unknown> {
  direct_without_client: string
  shared_unallocated: string
}

const safeCount = async (query: string, params?: unknown[]): Promise<number> => {
  try {
    const rows = await runGreenhousePostgresQuery<CountRow>(query, params)

    return Number(rows[0]?.cnt ?? 0)
  } catch {
    return 0
  }
}

const tableExists = async (schema: string, table: string): Promise<boolean> => {
  try {
    const rows = await runGreenhousePostgresQuery<Record<string, unknown> & { exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2) AS exists`,
      [schema, table]
    )

    return rows[0]?.exists === true
  } catch {
    return false
  }
}

const deriveHealth = (
  processed: number,
  failed: number,
  lastRun: string | null,
  tblExists: boolean
): OperationsHealthStatus => {
  if (!tblExists) return 'not_configured'
  if (processed === 0 && failed === 0 && !lastRun) return 'idle'
  if (!lastRun && failed === 0) return 'healthy'

  if (lastRun) {
    const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / 3_600_000

    if (failed > 0 && hoursAgo > 72) return 'down'
    if (failed > 0 || hoursAgo > 36) return 'degraded'
  } else if (failed > 0) {
    return 'down'
  }

  return 'healthy'
}

const pluralize = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`

const describeFinanceMetric = (metric: OperationsSubsystemMetric) => {
  switch (metric.key) {
    case 'payment_ledger_integrity':
      return pluralize(metric.value, 'drift de ledger', 'drifts de ledger')
    case 'direct_cost_without_client':
      return pluralize(metric.value, 'costo directo sin cliente', 'costos directos sin cliente')
    case 'overdue_receivables':
      return pluralize(metric.value, 'cuenta por cobrar vencida', 'cuentas por cobrar vencidas')
    default:
      return `${metric.value} ${metric.label}`
  }
}

/**
 * Build the Finance Data Quality summary, separating *platform integrity*
 * issues (signal that the data layer itself is wrong) from *operational
 * hygiene* metrics (counters that track human work — overdue receivables,
 * unallocated overheads). Only platform integrity escalates the subsystem to
 * `degraded`; operational hygiene is shown as informational context.
 */
const buildFinanceDataQualitySummary = (metrics: OperationsSubsystemMetric[]) => {
  const platformIssueMetrics = metrics.filter(
    metric => (metric.status === 'warning' || metric.status === 'error') && isPlatformIntegrityMetric(metric.key)
  )

  const operationalMetrics = metrics.filter(metric => !isPlatformIntegrityMetric(metric.key))

  const operationalSummaryParts = operationalMetrics
    .filter(metric => metric.value > 0)
    .map(metric => `${metric.value} ${metric.label.toLowerCase()}`)

  if (platformIssueMetrics.length === 0) {
    if (operationalSummaryParts.length === 0) {
      return 'Plataforma sana · sin pendientes operativos.'
    }

    return `Plataforma sana · pendientes operativos: ${operationalSummaryParts.join(', ')}.`
  }

  const issueParts = platformIssueMetrics.map(describeFinanceMetric)

  const operationalSuffix = operationalSummaryParts.length > 0
    ? ` Pendientes operativos paralelos: ${operationalSummaryParts.join(', ')}.`
    : ''

  return `${pluralize(platformIssueMetrics.length, 'integridad rota', 'integridades rotas')}: ${issueParts.join(', ')}.${operationalSuffix}`
}

/**
 * Platform integrity metrics — these signal that the data layer itself is
 * inconsistent and require a code, sync, or migration fix. Anything else
 * (overdue invoices, unallocated overheads) is operational hygiene that the
 * business team owns, not an incident the on-call should react to.
 */
const PLATFORM_INTEGRITY_METRIC_KEYS = new Set<string>([
  'payment_ledger_integrity',
  'direct_cost_without_client',
  'labor_allocation_saturation_drift'
])

const isPlatformIntegrityMetric = (key: string): boolean =>
  PLATFORM_INTEGRITY_METRIC_KEYS.has(key)

export const buildFinanceDataQualitySubsystem = async (): Promise<OperationsSubsystem> => {
  try {
    const hasFinanceTables = await tableExists('greenhouse_finance', 'income')

    if (!hasFinanceTables) {
      return {
        name: 'Finance Data Quality',
        status: 'not_configured',
        processed: 0,
        failed: 0,
        lastRun: null,
        summary: null,
        metrics: []
      }
    }

    const [divergentPayments, overdueCount, allocationRows, saturationDriftRows] = await Promise.all([
      // Ledger integrity goes through the canonical reconciliation helper.
      // DO NOT inline a `SUM(income_payments)` query here — that ignores
      // factoring fees and withholdings and produces false drift.
      countIncomesWithSettlementDrift().catch(() => 0),
      safeCount(
        `SELECT COUNT(*) AS cnt FROM greenhouse_finance.income
         WHERE payment_status IN ('pending', 'partial', 'overdue') AND due_date < CURRENT_DATE`
      ),
      runGreenhousePostgresQuery<FinanceAllocationCountsRow>(
        `SELECT
           COUNT(*) FILTER (
             WHERE COALESCE(e.cost_is_direct, FALSE) = TRUE
               AND COALESCE(NULLIF(e.allocated_client_id, ''), NULLIF(e.client_id, '')) IS NULL
           )::text AS direct_without_client,
           COUNT(*) FILTER (
             WHERE COALESCE(e.cost_is_direct, FALSE) = FALSE
               AND COALESCE(NULLIF(e.allocated_client_id, ''), NULLIF(e.client_id, '')) IS NULL
           )::text AS shared_unallocated
         FROM greenhouse_finance.expenses e
         WHERE COALESCE(e.is_annulled, FALSE) = FALSE
           AND e.expense_type NOT IN ('tax', 'social_security')`
      ).catch(() => [{ direct_without_client: '0', shared_unallocated: '0' }]),
      // TASK-709: detecta over-saturation (member dedica >100% a clientes en
      // un período = imposible). Si retorna rows, indica bug en
      // client_team_assignments upstream (overlapping assignments mal
      // partitionados por date range).
      runGreenhousePostgresQuery<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt FROM greenhouse_serving.labor_allocation_saturation_drift`
      ).catch(() => [{ cnt: '0' }])
    ])

    const directCostWithoutClient = Number(allocationRows[0]?.direct_without_client ?? 0)
    const sharedOverheadUnallocated = Number(allocationRows[0]?.shared_unallocated ?? 0)
    const laborSaturationDrift = Number(saturationDriftRows[0]?.cnt ?? 0)

    const metrics: OperationsSubsystemMetric[] = [
      {
        key: 'payment_ledger_integrity',
        label: 'Drift de ledger',
        value: divergentPayments,
        status: divergentPayments === 0 ? 'ok' : 'warning'
      },
      {
        key: 'direct_cost_without_client',
        label: 'Costo directo sin cliente',
        value: directCostWithoutClient,
        status: directCostWithoutClient === 0 ? 'ok' : 'warning'
      },
      {
        key: 'overdue_receivables',
        label: 'Cartera vencida',
        value: overdueCount,

        // Operational KPI — the existence of overdue invoices is a business
        // workflow signal (collections), not a platform integrity issue. We
        // surface the count for visibility but never escalate the subsystem
        // because of it. See `isPlatformIntegrityMetric`.
        status: 'info'
      },
      {
        key: 'shared_overhead_unallocated',
        label: 'Overhead compartido no asignado',
        value: sharedOverheadUnallocated,
        status: 'info'
      },
      {
        // TASK-709: invariante BD que detecta over-saturation en labor
        // allocation. Cuando > 0 = bug en client_team_assignments upstream
        // (assignments overlapping para mismo miembro/período sin date
        // partitioning). Platform integrity issue real, no operacional.
        key: 'labor_allocation_saturation_drift',
        label: 'Drift de capacidad laboral (FTE > 100%)',
        value: laborSaturationDrift,
        status: laborSaturationDrift === 0 ? 'ok' : 'warning'
      }
    ]

    const platformIssueMetrics = metrics.filter(
      metric => (metric.status === 'warning' || metric.status === 'error') && isPlatformIntegrityMetric(metric.key)
    )

    const status: OperationsHealthStatus = platformIssueMetrics.length > 0 ? 'degraded' : 'healthy'

    const platformMetricsCount = metrics.filter(metric => isPlatformIntegrityMetric(metric.key)).length

    return {
      name: 'Finance Data Quality',
      status,
      processed: platformMetricsCount,
      failed: platformIssueMetrics.length,
      lastRun: new Date().toISOString(),
      summary: buildFinanceDataQualitySummary(metrics),
      metrics
    }
  } catch {
    return {
      name: 'Finance Data Quality',
      status: 'idle',
      processed: 0,
      failed: 0,
      lastRun: null,
      summary: 'No se pudo construir el resumen de data quality financiera.',
      metrics: []
    }
  }
}

const buildNotionDeliveryDataQualitySubsystem = (
  overview: IntegrationDataQualityOverview | null
): OperationsSubsystem => {
  if (!overview || overview.totals.totalSpaces === 0) {
    return {
      name: 'Notion Delivery Data Quality',
      status: 'idle',
      processed: 0,
      failed: 0,
      lastRun: null
    }
  }

  const latestRun = overview.recentRuns[0]?.checkedAt ?? null

  // Auto-recoverable spaces (only `fresh_raw_after_conformed_sync` lag) are
  // *expected* eventual consistency, not incidents. They count toward `failed`
  // for visibility but never escalate the subsystem to `down` — the upstream
  // conformed sync will catch up on its own.
  const manualBrokenSpaces = Math.max(
    0,
    overview.totals.brokenSpaces - (overview.totals.autoRecoverableSpaces ?? 0)
  )

  const failed = overview.totals.brokenSpaces + overview.totals.degradedSpaces

  const status: OperationsHealthStatus =
    manualBrokenSpaces > 0
      ? 'down'
      : overview.totals.brokenSpaces > 0 || overview.totals.degradedSpaces > 0 || overview.totals.unknownSpaces > 0
        ? 'degraded'
        : 'healthy'

  const autoRecoverable = overview.totals.autoRecoverableSpaces ?? 0

  const summary = manualBrokenSpaces > 0
    ? `${manualBrokenSpaces} space(s) requieren intervención${autoRecoverable > 0 ? ` · ${autoRecoverable} con lag auto-recuperable` : ''}`
    : autoRecoverable > 0
      ? `${autoRecoverable} con lag auto-recuperable (conformed sync se pondrá al día)`
      : null

  return {
    name: 'Notion Delivery Data Quality',
    status,
    processed: overview.totals.totalSpaces,
    failed,
    lastRun: latestRun,
    summary
  }
}

export const getOperationsOverview = async (): Promise<OperationsOverview> => {
  const [
    hasOutbox,
    hasProjections,
    hasReactiveLog,
    hasNotifications,
    hasServices,
    hasIcoMetrics,
    hasIcoAiSignals,
    hasWebhookEndpoints,
    hasWebhookInbox,
    hasWebhookDeliveries,
    hasWebhookSubscriptions
  ] = await Promise.all([
    tableExists('greenhouse_sync', 'outbox_events'),
    tableExists('greenhouse_sync', 'projection_refresh_queue'),
    tableExists('greenhouse_sync', 'outbox_reactive_log'),
    tableExists('greenhouse_notifications', 'notifications'),
    tableExists('greenhouse_core', 'services'),
    tableExists('greenhouse_serving', 'ico_member_metrics'),
    tableExists('greenhouse_serving', 'ico_ai_signals'),
    tableExists('greenhouse_sync', 'webhook_endpoints'),
    tableExists('greenhouse_sync', 'webhook_inbox_events'),
    tableExists('greenhouse_sync', 'webhook_deliveries'),
    tableExists('greenhouse_sync', 'webhook_subscriptions')
  ])

  const aiLlmSnapshot = await readAiLlmOperationsSnapshot().catch(() => ({
    tablesReady: false,
    processed: 0,
    failed: 0,
    lastRun: null,
    latestRun: null,
    lastProcessedAt: null
  }))

  const lastReactiveWorkerRun = await getLastReactiveRun().catch(() => null)

  const [outboxEvents24h, pendingProjections, notificationsSent24h, activeSyncs, failedHandlers, reactiveBacklog] =
    await Promise.all([
      safeCount(
        `SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours'`
      ),
      safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.projection_refresh_queue WHERE status = 'pending'`),
      safeCount(
        `SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications WHERE created_at > NOW() - INTERVAL '24 hours'`
      ),
      safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE`),
      // KPI canónica: cuenta handlers DISTINTOS en estado degraded/failed/quarantined
      // desde el state machine (`handler_health`), no rows del audit log. Antes
      // este KPI reportaba "7522 handlers degradados" sumando filas lifetime
      // de retries; un único handler con 4193 retries aparecía como 4193
      // "handlers degraded". El state machine produce un número honesto.
      hasReactiveLog
        ? safeCount(
            `SELECT COUNT(*) AS cnt FROM greenhouse_sync.handler_health WHERE current_state <> 'healthy'`
          )
        : 0,
      readReactiveBacklogOverview()
    ])

  const [
    outboxProcessed,
    outboxFailed,
    outboxLastRun,
    projCompleted,
    projFailed,
    projLastRun,
    notifTotal,
    notifFailed,
    notionLastSync,
    servicesLastSync,
    icoLastSync,
    icoAiSignalsLastSync,
    webhookEndpointsActive,
    webhookSubscriptionsActive,
    webhookInboxReceived24h,
    webhookInboxFailed24h,
    webhookDeliveriesPending,
    webhookDeliveriesRetryScheduled,
    webhookDeliveriesDeadLetter,
    webhookSecretRefsRegistered,
    webhookLastInboxAt,
    webhookLastDeliveryAt
  ] = await Promise.all([
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours' AND status = 'processed'`
    ),
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours' AND status = 'failed'`
    ),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(occurred_at)::text AS last_run FROM greenhouse_sync.outbox_events`
    )
      .then(rows => rows[0]?.last_run ?? null)
      .catch(() => null),

    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.projection_refresh_queue WHERE status = 'completed'`),
    // DLQ-aware Proyecciones warning surface. Counts:
    //   1) status='dead' — application/data fault, recovery cron will not help.
    //   2) status='failed' that the recovery cron has been retrying for >24h
    //      without success — infra/credential fault that never auto-resolved.
    // Transient `failed` rows from the last 24h are hidden because the recovery
    // cron is actively working on them and a yellow chip every time a single
    // projection blips would be noise.
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.projection_refresh_queue
        WHERE COALESCE(archived, FALSE) = FALSE
          AND (
            status = 'dead'
            OR (
              status = 'failed'
              AND retry_count >= max_retries
              AND updated_at < NOW() - INTERVAL '24 hours'
            )
          )`
    ),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(updated_at)::text AS last_run FROM greenhouse_sync.projection_refresh_queue WHERE status = 'completed'`
    )
      .then(rows => rows[0]?.last_run ?? null)
      .catch(() => null),

    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications WHERE status = 'failed'`),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(last_synced_at)::text AS last_sync FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE`
    )
      .then(rows => rows[0]?.last_sync ?? null)
      .catch(() => null),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(hubspot_last_synced_at)::text AS last_sync FROM greenhouse_core.services`
    )
      .then(rows => rows[0]?.last_sync ?? null)
      .catch(() => null),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(materialized_at)::text AS last_sync FROM greenhouse_serving.ico_member_metrics`
    )
      .then(rows => rows[0]?.last_sync ?? null)
      .catch(() => null),
    hasIcoAiSignals
      ? runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
          `SELECT MAX(generated_at)::text AS last_sync FROM greenhouse_serving.ico_ai_signals`
        )
          .then(rows => rows[0]?.last_sync ?? null)
          .catch(() => null)
      : null,

    hasWebhookEndpoints
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_endpoints WHERE active = TRUE`)
      : 0,
    hasWebhookSubscriptions
      ? safeCount(
          `SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_subscriptions WHERE active = TRUE AND paused_at IS NULL`
        )
      : 0,
    hasWebhookInbox
      ? safeCount(
          `SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_inbox_events WHERE received_at > NOW() - INTERVAL '24 hours'`
        )
      : 0,
    hasWebhookInbox
      ? safeCount(
          `SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_inbox_events WHERE status IN ('failed', 'dead_letter') AND received_at > NOW() - INTERVAL '24 hours'`
        )
      : 0,
    hasWebhookDeliveries
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_deliveries WHERE status = 'pending'`)
      : 0,
    hasWebhookDeliveries
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_deliveries WHERE status = 'retry_scheduled'`)
      : 0,
    // KPI canónica: dead-letters ACTIVOS (sin acknowledged_at, sin archived_at).
    // Antes contaba lifetime y mostraba "1 delivery dead-letter" por una row
    // del 29-marzo que ya nadie iba a recover. Mismo patrón que handler_health:
    // recovery + ack son first-class en el contrato.
    hasWebhookDeliveries
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_deliveries WHERE status = 'dead_letter' AND acknowledged_at IS NULL AND archived_at IS NULL`)
      : 0,
    hasWebhookEndpoints || hasWebhookSubscriptions
      ? safeCount(`
          SELECT COUNT(*) AS cnt
          FROM (
            SELECT secret_ref FROM greenhouse_sync.webhook_endpoints WHERE secret_ref IS NOT NULL
            UNION
            SELECT secret_ref FROM greenhouse_sync.webhook_subscriptions WHERE secret_ref IS NOT NULL
          ) refs
        `)
      : 0,
    hasWebhookInbox
      ? runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
          `SELECT MAX(received_at)::text AS last_run FROM greenhouse_sync.webhook_inbox_events`
        )
          .then(rows => rows[0]?.last_run ?? null)
          .catch(() => null)
      : null,
    hasWebhookDeliveries
      ? runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
          `SELECT MAX(created_at)::text AS last_run FROM greenhouse_sync.webhook_deliveries`
        )
          .then(rows => rows[0]?.last_run ?? null)
          .catch(() => null)
      : null
  ])

  const hasNotionSync = activeSyncs > 0

  const servicesCount = hasServices
    ? await safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.services WHERE active = TRUE`)
    : 0

  const icoMetricsCount = hasIcoMetrics
    ? await safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_serving.ico_member_metrics`)
    : 0

  const icoAiSignalsCount = hasIcoAiSignals
    ? await safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_serving.ico_ai_signals`)
    : 0

  let notionDeliveryDataQuality: IntegrationDataQualityOverview | null = null

  try {
    notionDeliveryDataQuality = await getNotionDeliveryDataQualityOverview({ limit: 10 })
  } catch {
    notionDeliveryDataQuality = null
  }

  const [teamsSent24h, teamsFailed24h, teamsLastRun, teamsLogicAppSent24h, teamsBotSent24h, teamsPendingSetup] = await Promise.all([
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.source_sync_runs WHERE source_system = 'teams_notification' AND status = 'succeeded' AND started_at > NOW() - INTERVAL '24 hours'`
    ),
    safeCount(
      // Exclude failures that come from `pending_setup` channels — those are
      // configuration gaps (secret not yet provisioned in GCP Secret Manager),
      // not real send incidents. The reliability dashboard surfaces them via
      // a separate "Channels esperando setup" admin widget instead. The
      // notes column carries `secret_ref=…` so we can join back to the
      // channel registry to filter.
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.source_sync_runs r
         WHERE r.source_system = 'teams_notification'
           AND r.status = 'failed'
           AND r.started_at > NOW() - INTERVAL '24 hours'
           AND NOT EXISTS (
             SELECT 1 FROM greenhouse_core.teams_notification_channels c
              WHERE c.provisioning_status = 'pending_setup'
                AND r.notes IS NOT NULL
                AND r.notes LIKE '%secret_ref=' || c.secret_ref || '%'
           )`
    ),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(COALESCE(finished_at, started_at))::text AS last_run FROM greenhouse_sync.source_sync_runs WHERE source_system = 'teams_notification'`
    )
      .then(rows => rows[0]?.last_run ?? null)
      .catch(() => null),
    // TASK-671: breakdown by transport. The sender writes
    // `transport=logic_app` or `transport=bot_framework` into notes for every
    // successful send.
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.source_sync_runs
        WHERE source_system = 'teams_notification'
          AND status = 'succeeded'
          AND started_at > NOW() - INTERVAL '24 hours'
          AND notes LIKE '%transport=logic_app%'`
    ),
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_sync.source_sync_runs
        WHERE source_system = 'teams_notification'
          AND status = 'succeeded'
          AND started_at > NOW() - INTERVAL '24 hours'
          AND notes LIKE '%transport=bot_framework%'`
    ),
    safeCount(
      `SELECT COUNT(*) AS cnt FROM greenhouse_core.teams_notification_channels
        WHERE provisioning_status = 'pending_setup'
          AND disabled_at IS NULL`
    )
  ])

  const teamsHasActivity = teamsSent24h + teamsFailed24h > 0
  const teamsBreakdownParts: string[] = []

  if (teamsLogicAppSent24h > 0) teamsBreakdownParts.push(`Logic Apps ${teamsLogicAppSent24h}`)
  if (teamsBotSent24h > 0) teamsBreakdownParts.push(`Bot ${teamsBotSent24h}`)
  if (teamsPendingSetup > 0) teamsBreakdownParts.push(`Pending setup ${teamsPendingSetup}`)

  const teamsSummary = teamsBreakdownParts.length > 0
    ? `Envíos 24h por transporte: ${teamsBreakdownParts.join(' · ')}`
    : null

  const subsystems: OperationsSubsystem[] = [
    {
      name: 'Outbox',
      status: deriveHealth(outboxProcessed, outboxFailed, outboxLastRun, hasOutbox),
      processed: outboxProcessed,
      failed: outboxFailed,
      lastRun: outboxLastRun
    },
    {
      name: 'Proyecciones',
      status: deriveHealth(projCompleted, projFailed, projLastRun, hasProjections),
      processed: projCompleted,
      failed: projFailed,
      lastRun: projLastRun,
      summary: projFailed > 0
        ? `${projCompleted} completadas · ${projFailed} en dead-letter (requieren intervención manual)`
        : null
    },
    {
      name: 'Reactive backlog',
      status: reactiveBacklog.status,
      processed: reactiveBacklog.totalUnreacted,
      failed: reactiveBacklog.last24hUnreacted,
      lastRun: reactiveBacklog.lastReactedAt
    },
    {
      name: 'Reactive Worker',
      status: lastReactiveWorkerRun
        ? lastReactiveWorkerRun.status === 'succeeded' || lastReactiveWorkerRun.status === 'partial'
          ? 'healthy'
          : lastReactiveWorkerRun.status === 'failed'
            ? 'degraded'
            : 'idle'
        : 'idle',
      processed: lastReactiveWorkerRun?.eventsProcessed ?? 0,
      failed: lastReactiveWorkerRun?.status === 'failed' ? 1 : 0,
      lastRun: lastReactiveWorkerRun?.finishedAt ?? lastReactiveWorkerRun?.startedAt ?? null
    },
    {
      name: 'AI LLM Enrichment',
      status: aiLlmSnapshot.tablesReady
        ? deriveHealth(aiLlmSnapshot.processed, aiLlmSnapshot.failed, aiLlmSnapshot.lastRun, aiLlmSnapshot.tablesReady)
        : 'not_configured',
      processed: aiLlmSnapshot.processed,
      failed: aiLlmSnapshot.failed,
      lastRun: aiLlmSnapshot.lastRun
    },
    {
      name: 'Notificaciones',
      status: deriveHealth(notifTotal, notifFailed, null, hasNotifications),
      processed: notifTotal,
      failed: notifFailed,
      lastRun: null
    },
    {
      name: 'Teams Notifications',
      status: deriveHealth(teamsSent24h, teamsFailed24h, teamsLastRun, teamsHasActivity),
      processed: teamsSent24h,
      failed: teamsFailed24h,
      lastRun: teamsLastRun,
      summary: teamsSummary,
      metrics: [
        {
          key: 'logic_app_sent_24h',
          label: 'Vía Logic Apps (24h)',
          value: teamsLogicAppSent24h,
          status: 'ok'
        },
        {
          key: 'bot_framework_sent_24h',
          label: 'Vía Bot Framework (24h)',
          value: teamsBotSent24h,
          status: 'ok'
        },
        {
          key: 'pending_setup_channels',
          label: 'Canales pending_setup',
          value: teamsPendingSetup,
          status: teamsPendingSetup > 0 ? 'warning' : 'ok'
        }
      ]
    },
    {
      name: 'Notion Sync',
      status: deriveHealth(activeSyncs, 0, notionLastSync, hasNotionSync),
      processed: activeSyncs,
      failed: 0,
      lastRun: notionLastSync
    },
    {
      name: 'Services Sync',
      status: deriveHealth(servicesCount, 0, servicesLastSync, hasServices),
      processed: servicesCount,
      failed: 0,
      lastRun: servicesLastSync
    },
    {
      name: 'ICO Sync',
      status: deriveHealth(icoMetricsCount, 0, icoLastSync, hasIcoMetrics),
      processed: icoMetricsCount,
      failed: 0,
      lastRun: icoLastSync
    },
    {
      name: 'AI Core',
      status: deriveHealth(icoAiSignalsCount, 0, icoAiSignalsLastSync, hasIcoAiSignals),
      processed: icoAiSignalsCount,
      failed: 0,
      lastRun: icoAiSignalsLastSync
    },
    await buildFinanceDataQualitySubsystem(),
    buildNotionDeliveryDataQualitySubsystem(notionDeliveryDataQuality)
  ]

  interface EventRow extends Record<string, unknown> {
    event_type: string
    aggregate_type: string
    aggregate_id: string
    occurred_at: string
    status: string
  }

  interface ProjectionRow extends Record<string, unknown> {
    projection_name: string
    entity_type: string
    entity_id: string
    updated_at: string
    error_message: string | null
    error_class: string | null
    is_infrastructure_fault: boolean | null
  }

  interface SecretRefRow extends Record<string, unknown> {
    secret_ref: string
    source_kind: 'endpoint' | 'subscription'
    auth_mode: string | null
  }

  let recentEvents: OperationsRecentEvent[] = []

  try {
    const rows = await runGreenhousePostgresQuery<EventRow>(
      `SELECT event_type, aggregate_type, aggregate_id, occurred_at::text, COALESCE(status, 'processed') AS status
       FROM greenhouse_sync.outbox_events
       ORDER BY occurred_at DESC
       LIMIT 20`
    )

    recentEvents = rows.map(row => ({
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      occurredAt: row.occurred_at,
      status: row.status
    }))
  } catch {
    recentEvents = []
  }

  let failedProjections: OperationsFailedProjection[] = []

  try {
    const rows = await runGreenhousePostgresQuery<ProjectionRow>(
      `SELECT projection_name, entity_type, entity_id, updated_at::text, error_message, error_class, is_infrastructure_fault
       FROM greenhouse_sync.projection_refresh_queue
       WHERE status = 'failed'
       ORDER BY updated_at DESC
       LIMIT 10`
    )

    failedProjections = rows.map(row => ({
      projectionName: row.projection_name,
      entityType: row.entity_type,
      entityId: row.entity_id,
      failedAt: row.updated_at,
      errorMessage: row.error_message || 'Unknown error',
      errorClass: row.error_class ?? null,
      isInfrastructure: Boolean(row.is_infrastructure_fault ?? false)
    }))
  } catch {
    failedProjections = []
  }

  let failedHandlersRows: OperationsFailedHandler[] = []

  try {
    if (hasReactiveLog) {
      // Lectura canónica: un row por handler distinto con state != healthy.
      // Antes esta query devolvía las últimas 10 filas del audit log, lo cual
      // mostraba el mismo handler 10 veces si fallaba seguido. El state
      // machine produce una única vista por handler con su error más
      // reciente (joined contra el log para preservar el `last_error`).
      const rows = await runGreenhousePostgresQuery<
        {
          handler: string
          current_state: string
          consecutive_failures: number
          last_failure_at: string | null
          last_error: string | null
          last_error_class: string | null
          is_infrastructure_fault: boolean | null
        } & Record<string, unknown>
      >(
        `SELECT
            h.handler,
            h.current_state,
            h.consecutive_failures,
            h.last_failure_at::text AS last_failure_at,
            latest.last_error,
            h.last_error_class,
            latest.is_infrastructure_fault
          FROM greenhouse_sync.handler_health h
          LEFT JOIN LATERAL (
            SELECT last_error, is_infrastructure_fault
              FROM greenhouse_sync.outbox_reactive_log r
             WHERE r.handler = h.handler
               AND r.result IN ('retry','dead-letter')
             ORDER BY r.reacted_at DESC
             LIMIT 1
          ) latest ON TRUE
          WHERE h.current_state <> 'healthy'
          ORDER BY
            CASE h.current_state
              WHEN 'failed' THEN 0
              WHEN 'quarantined' THEN 1
              WHEN 'degraded' THEN 2
              ELSE 3
            END,
            h.last_failure_at DESC NULLS LAST
          LIMIT 10`
      )

      failedHandlersRows = rows.map(row => ({
        handler: row.handler,
        result: row.current_state === 'failed' || row.current_state === 'quarantined' ? 'dead-letter' : 'retry',
        retries: Number(row.consecutive_failures ?? 0),
        reactedAt: row.last_failure_at ?? new Date(0).toISOString(),
        lastError: row.last_error || 'Unknown error',
        errorClass: row.last_error_class ?? null,
        isInfrastructure: Boolean(row.is_infrastructure_fault ?? false)
      }))
    }
  } catch {
    failedHandlersRows = []
  }

  let secretRefs: OperationsWebhookOverview['secretRefs'] = []

  try {
    if (hasWebhookEndpoints || hasWebhookSubscriptions) {
      const rows = await runGreenhousePostgresQuery<SecretRefRow>(
        `SELECT secret_ref, source_kind, auth_mode
         FROM (
           SELECT secret_ref, 'endpoint'::text AS source_kind, auth_mode
           FROM greenhouse_sync.webhook_endpoints
           WHERE secret_ref IS NOT NULL
           UNION ALL
           SELECT secret_ref, 'subscription'::text AS source_kind, auth_mode
           FROM greenhouse_sync.webhook_subscriptions
           WHERE secret_ref IS NOT NULL
         ) refs
         ORDER BY source_kind, secret_ref
         LIMIT 20`
      )

      secretRefs = rows.map(row => ({
        secretRef: row.secret_ref,
        sourceKind: row.source_kind,
        authMode: row.auth_mode
      }))
    }
  } catch {
    secretRefs = []
  }

  const [cloudHealth, observabilityPosture, sentryIncidents] = await Promise.all([
    getCloudPlatformHealthSnapshot().catch<CloudHealthSnapshot>(() =>
      buildCloudHealthSnapshot({
        runtimeChecks: [],
        timestamp: new Date().toISOString()
      })
    ),
    getCloudObservabilityPosture().catch(() => ({
      summary: 'Observabilidad externa no configurada',
      sentry: {
        dsnConfigured: false,
        clientDsnConfigured: false,
        authTokenConfigured: false,
        orgConfigured: false,
        projectConfigured: false,
        enabled: false,
        sourceMapsReady: false
      },
      slack: {
        alertsWebhookConfigured: false,
        enabled: false
      }
    })),
    getCloudSentryIncidents().catch(() => ({
      status: 'warning' as const,
      enabled: true,
      available: false,
      summary: 'Sentry no respondió; se mantiene fallback operativo',
      incidents: [],
      fetchedAt: new Date().toISOString(),
      error: 'incident reader failed unexpectedly'
    }))
  ])

  const cronState = getCronSecretState()
  const postgresConfig = getGreenhousePostgresConfig()
  const postgresConfigured = isGreenhousePostgresConfigured()
  const postgresPosture = getCloudPostgresPosture()
  const gcpAuthPosture = getCloudGcpAuthPosture()
  const maximumBytesBilled = getBigQueryMaximumBytesBilled()

  const bigQueryProjectId = (() => {
    try {
      return getBigQueryProjectId()
    } catch {
      return null
    }
  })()

  const healthChecksByName = new Map(cloudHealth.checks.map(check => [check.name, check]))
  const postgresHealth = healthChecksByName.get('postgres')
  const bigQueryHealth = healthChecksByName.get('bigquery')

  const cloudControls: CloudPlatformControl[] = [
    {
      key: 'gcp_auth',
      label: 'GCP auth posture',
      status:
        gcpAuthPosture.mode === 'wif'
          ? 'ok'
          : gcpAuthPosture.mode === 'mixed' || gcpAuthPosture.mode === 'service_account_key'
            ? 'warning'
            : 'failed',
      summary: gcpAuthPosture.summary,
      details: {
        oidcAvailable: gcpAuthPosture.oidcAvailable,
        workloadIdentityConfigured: gcpAuthPosture.workloadIdentityConfigured,
        serviceAccountKeyConfigured: gcpAuthPosture.serviceAccountKeyConfigured
      }
    },
    {
      key: 'postgres',
      label: 'Cloud SQL runtime',
      status: postgresHealth?.ok
        ? postgresPosture.risks.length === 0
          ? 'ok'
          : 'warning'
        : postgresConfigured
          ? 'failed'
          : 'warning',
      summary: postgresHealth?.ok
        ? postgresPosture.summary
        : (postgresHealth?.summary ??
          (postgresConfigured ? 'Cloud SQL no respondió al health check' : 'Postgres runtime no configurado')),
      details: {
        maxConnections: postgresConfig.maxConnections,
        usesConnector: Boolean(postgresConfig.instanceConnectionName),
        sslEnabled: postgresPosture.sslEnabled,
        risks: postgresPosture.risks
      }
    },
    {
      key: 'bigquery',
      label: 'BigQuery runtime',
      status: bigQueryHealth?.ok ? 'ok' : bigQueryProjectId ? 'failed' : 'warning',
      summary:
        bigQueryHealth?.summary ??
        (bigQueryProjectId ? 'BigQuery no respondió al health check' : 'BigQuery project no configurado'),
      details: {
        projectId: bigQueryProjectId
      }
    },
    {
      key: 'cron',
      label: 'Cron control plane',
      status: cronState.configured ? 'ok' : 'failed',
      summary: cronState.configured
        ? 'CRON_SECRET configurado para routes scheduler-driven'
        : 'CRON_SECRET ausente; control plane incompleto'
    },
    {
      key: 'cost_guard',
      label: 'BigQuery cost guard',
      status: maximumBytesBilled <= 1_000_000_000 ? 'ok' : 'warning',
      summary:
        maximumBytesBilled <= 1_000_000_000
          ? `Guard activo: ${maximumBytesBilled.toLocaleString('en-US')} bytes`
          : `Guard permisivo: ${maximumBytesBilled.toLocaleString('en-US')} bytes`,
      details: {
        maximumBytesBilled
      }
    }
  ]

  const failedCloudControls = cloudControls.filter(control => control.status === 'failed').length
  const warningCloudControls = cloudControls.filter(control => control.status === 'warning').length
  const cloudOverallStatus = failedCloudControls > 0 ? 'failed' : warningCloudControls > 0 ? 'warning' : 'ok'

  return {
    kpis: {
      outboxEvents24h,
      pendingProjections,
      hiddenReactiveBacklog: reactiveBacklog.totalUnreacted,
      notificationsSent24h,
      activeSyncs,
      failedHandlers
    },
    reactiveBacklog,
    subsystems,
    recentEvents,
    failedProjections,
    failedHandlers: failedHandlersRows,
    webhooks: {
      endpointsActive: webhookEndpointsActive,
      subscriptionsActive: webhookSubscriptionsActive,
      inboxReceived24h: webhookInboxReceived24h,
      inboxFailed24h: webhookInboxFailed24h,
      deliveriesPending: webhookDeliveriesPending,
      deliveriesRetryScheduled: webhookDeliveriesRetryScheduled,
      deliveriesDeadLetter: webhookDeliveriesDeadLetter,
      secretRefsRegistered: webhookSecretRefsRegistered,
      secretRefs,
      lastInboxAt: webhookLastInboxAt,
      lastDeliveryAt: webhookLastDeliveryAt,
      schemaReady: hasWebhookEndpoints && hasWebhookInbox && hasWebhookDeliveries && hasWebhookSubscriptions
    },
    notionDeliveryDataQuality,
    cloud: {
      health: cloudHealth,
      posture: {
        overallStatus: cloudOverallStatus,
        controls: cloudControls
      },
      auth: {
        mode: gcpAuthPosture.mode,
        summary: gcpAuthPosture.summary
      },
      cron: {
        secretConfigured: cronState.configured,
        summary: cronState.configured ? 'CRON_SECRET presente' : 'CRON_SECRET ausente'
      },
      postgres: {
        configured: postgresConfigured,
        usesConnector: Boolean(postgresConfig.instanceConnectionName),
        sslEnabled: postgresPosture.sslEnabled,
        maxConnections: postgresConfig.maxConnections,
        summary: postgresHealth?.ok
          ? postgresPosture.summary
          : (postgresHealth?.summary ?? (postgresConfigured ? 'Configurado sin respuesta de health' : 'No configurado'))
      },
      bigquery: {
        projectId: bigQueryProjectId,
        maximumBytesBilled,
        summary:
          bigQueryHealth?.summary ??
          (bigQueryProjectId ? 'Proyecto configurado sin respuesta de health' : 'Proyecto no configurado'),
        blockedQueries: [...getBlockedQueries()]
      },
      observability: {
        posture: observabilityPosture,
        incidents: sentryIncidents
      }
    }
  }
}
