import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

// ── Safe count helper — returns 0 if table doesn't exist ──

interface CountRow extends Record<string, unknown> { cnt: string | number }

const safeCount = async (query: string, params?: unknown[]): Promise<number> => {
  try {
    const rows = await runGreenhousePostgresQuery<CountRow>(query, params)

    return Number(rows[0]?.cnt ?? 0)
  } catch {
    return 0
  }
}

// ── Subsystem health derivation ──

type HealthStatus = 'healthy' | 'degraded' | 'down'

const deriveHealth = (processed: number, failed: number, lastRun: string | null): HealthStatus => {
  if (!lastRun) return 'down'

  const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / 3_600_000

  if (failed > 0 && hoursAgo > 48) return 'down'
  if (failed > 0 || hoursAgo > 24) return 'degraded'

  return 'healthy'
}

// ── Main handler ──

export async function GET() {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // KPIs — parallel
  const [outboxEvents24h, pendingProjections, notificationsSent24h, activeSyncs] = await Promise.all([
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.projection_refresh_queue WHERE status = 'pending'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications WHERE created_at > NOW() - INTERVAL '24 hours'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE`)
  ])

  // Subsystem health — parallel
  const [
    outboxProcessed, outboxFailed, outboxLastRun,
    projCompleted, projFailed, projLastRun,
    notifTotal, notifFailed,
    notionLastSync, servicesLastSync, icoLastSync
  ] = await Promise.all([
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours' AND status = 'processed'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.outbox_events WHERE occurred_at > NOW() - INTERVAL '24 hours' AND status = 'failed'`),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(occurred_at)::text AS last_run FROM greenhouse_core.outbox_events`
    ).then(r => r[0]?.last_run ?? null).catch(() => null),

    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.projection_refresh_queue WHERE status = 'completed'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_core.projection_refresh_queue WHERE status = 'failed'`),
    runGreenhousePostgresQuery<Record<string, unknown> & { last_run: string | null }>(
      `SELECT MAX(updated_at)::text AS last_run FROM greenhouse_core.projection_refresh_queue WHERE status = 'completed'`
    ).then(r => r[0]?.last_run ?? null).catch(() => null),

    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications`),
    safeCount(`SELECT COUNT(*) AS cnt FROM greenhouse_notifications.notifications WHERE status = 'failed'`),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(last_synced_at)::text AS last_sync FROM greenhouse_core.space_notion_sources WHERE sync_enabled = TRUE`
    ).then(r => r[0]?.last_sync ?? null).catch(() => null),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(hubspot_last_synced_at)::text AS last_sync FROM greenhouse_core.services`
    ).then(r => r[0]?.last_sync ?? null).catch(() => null),

    runGreenhousePostgresQuery<Record<string, unknown> & { last_sync: string | null }>(
      `SELECT MAX(materialized_at)::text AS last_sync FROM greenhouse_serving.ico_member_metrics`
    ).then(r => r[0]?.last_sync ?? null).catch(() => null)
  ])

  const subsystems = [
    { name: 'Outbox', status: deriveHealth(outboxProcessed, outboxFailed, outboxLastRun as string | null), processed: outboxProcessed, failed: outboxFailed, lastRun: outboxLastRun },
    { name: 'Proyecciones', status: deriveHealth(projCompleted, projFailed, projLastRun as string | null), processed: projCompleted, failed: projFailed, lastRun: projLastRun },
    { name: 'Notificaciones', status: deriveHealth(notifTotal, notifFailed, null), processed: notifTotal, failed: notifFailed, lastRun: null },
    { name: 'Notion Sync', status: deriveHealth(1, 0, notionLastSync as string | null), processed: 0, failed: 0, lastRun: notionLastSync },
    { name: 'Services Sync', status: deriveHealth(1, 0, servicesLastSync as string | null), processed: 0, failed: 0, lastRun: servicesLastSync },
    { name: 'ICO Sync', status: deriveHealth(1, 0, icoLastSync as string | null), processed: 0, failed: 0, lastRun: icoLastSync }
  ]

  // Recent events
  interface EventRow extends Record<string, unknown> {
    event_type: string; aggregate_type: string; aggregate_id: string; occurred_at: string; status: string
  }

  let recentEvents: { eventType: string; aggregateType: string; aggregateId: string; occurredAt: string; status: string }[] = []

  try {
    const rows = await runGreenhousePostgresQuery<EventRow>(
      `SELECT event_type, aggregate_type, aggregate_id, occurred_at::text, COALESCE(status, 'processed') AS status
       FROM greenhouse_core.outbox_events
       ORDER BY occurred_at DESC LIMIT 20`
    )

    recentEvents = rows.map(r => ({
      eventType: r.event_type,
      aggregateType: r.aggregate_type,
      aggregateId: r.aggregate_id,
      occurredAt: r.occurred_at,
      status: r.status
    }))
  } catch {
    // Table may not exist yet
  }

  // Failed projections
  interface ProjRow extends Record<string, unknown> {
    projection_name: string; entity_type: string; entity_id: string; updated_at: string; error_message: string | null
  }

  let failedProjections: { projectionName: string; entityType: string; entityId: string; failedAt: string; errorMessage: string }[] = []

  try {
    const rows = await runGreenhousePostgresQuery<ProjRow>(
      `SELECT projection_name, entity_type, entity_id, updated_at::text, error_message
       FROM greenhouse_core.projection_refresh_queue
       WHERE status = 'failed'
       ORDER BY updated_at DESC LIMIT 10`
    )

    failedProjections = rows.map(r => ({
      projectionName: r.projection_name,
      entityType: r.entity_type,
      entityId: r.entity_id,
      failedAt: r.updated_at,
      errorMessage: r.error_message || 'Unknown error'
    }))
  } catch {
    // Table may not exist yet
  }

  return NextResponse.json({
    kpis: { outboxEvents24h, pendingProjections, notificationsSent24h, activeSyncs },
    subsystems,
    recentEvents,
    failedProjections
  })
}
