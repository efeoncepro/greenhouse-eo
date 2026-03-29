import 'server-only'

import { getBigQueryMaximumBytesBilled } from '@/lib/cloud/bigquery'
import type { CloudHealthSnapshot } from '@/lib/cloud/contracts'
import { getCronSecretState } from '@/lib/cloud/cron'
import { getCloudGcpAuthPosture } from '@/lib/cloud/gcp-auth'
import { buildCloudHealthSnapshot, getCloudPlatformHealthSnapshot } from '@/lib/cloud/health'
import { getCloudPostgresPosture } from '@/lib/cloud/postgres'
import { getBigQueryProjectId } from '@/lib/bigquery'
import { getGreenhousePostgresConfig, isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface OperationsKpis {
  outboxEvents24h: number
  pendingProjections: number
  notificationsSent24h: number
  activeSyncs: number
  failedHandlers: number
}

export type OperationsHealthStatus = 'healthy' | 'degraded' | 'down' | 'not_configured' | 'idle'

export interface OperationsSubsystem {
  name: string
  status: OperationsHealthStatus
  processed: number
  failed: number
  lastRun: string | null
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
}

export interface OperationsFailedHandler {
  handler: string
  result: string
  retries: number
  reactedAt: string
  lastError: string
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
  subsystems: OperationsSubsystem[]
  recentEvents: OperationsRecentEvent[]
  failedProjections: OperationsFailedProjection[]
  failedHandlers: OperationsFailedHandler[]
  webhooks: OperationsWebhookOverview
  cloud: CloudPlatformOverview
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

    if (failed > 0 && hoursAgo > 48) return 'down'
    if (failed > 0 || hoursAgo > 24) return 'degraded'
  } else if (failed > 0) {
    return 'down'
  }

  return 'healthy'
}

export const getOperationsOverview = async (): Promise<OperationsOverview> => {
  const [hasOutbox, hasProjections, hasReactiveLog, hasNotifications, hasServices, hasIcoMetrics, hasWebhookEndpoints, hasWebhookInbox, hasWebhookDeliveries, hasWebhookSubscriptions] =
    await Promise.all([
      tableExists('greenhouse_sync', 'outbox_events'),
      tableExists('greenhouse_sync', 'projection_refresh_queue'),
      tableExists('greenhouse_sync', 'outbox_reactive_log'),
      tableExists('greenhouse_notifications', 'notifications'),
      tableExists('greenhouse_core', 'services'),
      tableExists('greenhouse_serving', 'ico_member_metrics'),
      tableExists('greenhouse_sync', 'webhook_endpoints'),
      tableExists('greenhouse_sync', 'webhook_inbox_events'),
      tableExists('greenhouse_sync', 'webhook_deliveries'),
      tableExists('greenhouse_sync', 'webhook_subscriptions')
    ])

  const [outboxEvents24h, pendingProjections, notificationsSent24h, activeSyncs, failedHandlers] = await Promise.all([
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.projection_refresh_queue WHERE status = 'pending'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications WHERE created_at > NOW() - INTERVAL '24 hours'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE`),
    hasReactiveLog
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_reactive_log WHERE result IN ('retry', 'dead-letter')`)
      : 0
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
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours' AND status = 'processed'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours' AND status = 'failed'`),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(occurred_at)::text AS last_run FROM greenhouse_sync.outbox_events`
    ).then(rows => rows[0]?.last_run ?? null).catch(() => null),

    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.projection_refresh_queue WHERE status = 'completed'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.projection_refresh_queue WHERE status = 'failed'`),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(updated_at)::text AS last_run FROM greenhouse_sync.projection_refresh_queue WHERE status = 'completed'`
    ).then(rows => rows[0]?.last_run ?? null).catch(() => null),

    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications WHERE status = 'failed'`),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(last_synced_at)::text AS last_sync FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE`
    ).then(rows => rows[0]?.last_sync ?? null).catch(() => null),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(hubspot_last_synced_at)::text AS last_sync FROM greenhouse_core.services`
    ).then(rows => rows[0]?.last_sync ?? null).catch(() => null),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(materialized_at)::text AS last_sync FROM greenhouse_serving.ico_member_metrics`
    ).then(rows => rows[0]?.last_sync ?? null).catch(() => null),

    hasWebhookEndpoints
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_endpoints WHERE active = TRUE`)
      : 0,
    hasWebhookSubscriptions
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_subscriptions WHERE active = TRUE AND paused_at IS NULL`)
      : 0,
    hasWebhookInbox
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_inbox_events WHERE received_at > NOW() - INTERVAL '24 hours'`)
      : 0,
    hasWebhookInbox
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_inbox_events WHERE status IN ('failed', 'dead_letter') AND received_at > NOW() - INTERVAL '24 hours'`)
      : 0,
    hasWebhookDeliveries
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_deliveries WHERE status = 'pending'`)
      : 0,
    hasWebhookDeliveries
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_deliveries WHERE status = 'retry_scheduled'`)
      : 0,
    hasWebhookDeliveries
      ? safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_sync.webhook_deliveries WHERE status = 'dead_letter'`)
      : 0,
    (hasWebhookEndpoints || hasWebhookSubscriptions)
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
        ).then(rows => rows[0]?.last_run ?? null).catch(() => null)
      : null,
    hasWebhookDeliveries
      ? runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
          `SELECT MAX(created_at)::text AS last_run FROM greenhouse_sync.webhook_deliveries`
        ).then(rows => rows[0]?.last_run ?? null).catch(() => null)
      : null
  ])

  const hasNotionSync = activeSyncs > 0

  const servicesCount = hasServices
    ? await safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.services WHERE active = TRUE`)
    : 0

  const icoMetricsCount = hasIcoMetrics
    ? await safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_serving.ico_member_metrics`)
    : 0

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
      lastRun: projLastRun
    },
    {
      name: 'Notificaciones',
      status: deriveHealth(notifTotal, notifFailed, null, hasNotifications),
      processed: notifTotal,
      failed: notifFailed,
      lastRun: null
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
    }
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
      `SELECT projection_name, entity_type, entity_id, updated_at::text, error_message
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
      errorMessage: row.error_message || 'Unknown error'
    }))
  } catch {
    failedProjections = []
  }

  let failedHandlersRows: OperationsFailedHandler[] = []

  try {
    if (hasReactiveLog) {
      const rows = await runGreenhousePostgresQuery<{
        handler: string
        result: string
        retries: number
        reacted_at: string
        last_error: string | null
      } & Record<string, unknown>>(
        `SELECT handler, result, retries, reacted_at::text, last_error
         FROM greenhouse_sync.outbox_reactive_log
         WHERE result IN ('retry', 'dead-letter')
         ORDER BY reacted_at DESC
         LIMIT 10`
      )

      failedHandlersRows = rows.map(row => ({
        handler: row.handler,
        result: row.result,
        retries: Number(row.retries ?? 0),
        reactedAt: row.reacted_at,
        lastError: row.last_error || 'Unknown error'
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

  const cloudHealth = await getCloudPlatformHealthSnapshot().catch<CloudHealthSnapshot>(() =>
    buildCloudHealthSnapshot({
      runtimeChecks: [],
      timestamp: new Date().toISOString()
    })
  )

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
      status: postgresHealth?.ok ? (postgresPosture.risks.length === 0 ? 'ok' : 'warning') : postgresConfigured ? 'failed' : 'warning',
      summary:
        postgresHealth?.ok
          ? postgresPosture.summary
          : (postgresHealth?.summary ?? (postgresConfigured ? 'Cloud SQL no respondió al health check' : 'Postgres runtime no configurado')),
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
      summary: bigQueryHealth?.summary ?? (bigQueryProjectId ? 'BigQuery no respondió al health check' : 'BigQuery project no configurado'),
      details: {
        projectId: bigQueryProjectId
      }
    },
    {
      key: 'cron',
      label: 'Cron control plane',
      status: cronState.configured ? 'ok' : 'failed',
      summary: cronState.configured ? 'CRON_SECRET configurado para routes scheduler-driven' : 'CRON_SECRET ausente; control plane incompleto'
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
    kpis: { outboxEvents24h, pendingProjections, notificationsSent24h, activeSyncs, failedHandlers },
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
        summary: postgresHealth?.ok ? postgresPosture.summary : (postgresHealth?.summary ?? (postgresConfigured ? 'Configurado sin respuesta de health' : 'No configurado'))
      },
      bigquery: {
        projectId: bigQueryProjectId,
        maximumBytesBilled,
        summary: bigQueryHealth?.summary ?? (bigQueryProjectId ? 'Proyecto configurado sin respuesta de health' : 'Proyecto no configurado')
      }
    }
  }
}
