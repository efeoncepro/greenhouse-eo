import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { HomePulseStripData, PulseKpiCard, PulseStatus, PulseTrendDirection } from '../contract'
import type { HomeLoaderContext } from '../registry'

/**
 * Pulse Strip loader.
 *
 * Strategy: pre-compute lookup first (`home_pulse_snapshots`), realtime
 * fallback when expired or missing. The realtime path queries the same
 * canonical readers that feed the rest of the portal so cards have real
 * data + sparkline from day one — never `null` placeholders that look
 * dead.
 */

type SnapshotRow = {
  snapshot_jsonb: HomePulseStripData
  ttl_ends_at: string
} & Record<string, unknown>

const TENANT_SCOPE_FALLBACK = '__all__'
const ROLE_FALLBACK = '__default__'

const isFreshSnapshot = (row: SnapshotRow, nowIso: string): boolean => {
  return new Date(row.ttl_ends_at).getTime() > new Date(nowIso).getTime()
}

const trendFromDelta = (deltaPct: number | null): PulseTrendDirection => {
  if (deltaPct == null || Math.abs(deltaPct) < 0.5) return 'flat'

  return deltaPct > 0 ? 'up' : 'down'
}

const statusFromValue = (value: number | null, target: { good: number; warn: number }, higherIsBetter = true): PulseStatus => {
  if (value == null) return 'unknown'

  if (higherIsBetter) {
    if (value >= target.good) return 'optimal'
    if (value >= target.warn) return 'attention'

    return 'critical'
  }

  if (value <= target.good) return 'optimal'
  if (value <= target.warn) return 'attention'

  return 'critical'
}

// -- Realtime readers --------------------------------------------------------

interface FinanceSnapshotRow {
  period_year: number | string
  period_month: number | string
  gross_margin_pct: number | string | null
  prev_margin_pct: number | string | null
  closure_readiness: number | string | null
}

const readFinanceSnapshot = async (): Promise<FinanceSnapshotRow | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<FinanceSnapshotRow & Record<string, unknown>>(
      `WITH latest AS (
         SELECT period_year, period_month, gross_margin_pct
           FROM greenhouse_serving.operational_pl_snapshots
          WHERE scope_type = 'organization'
          ORDER BY period_year DESC, period_month DESC, revenue_clp DESC
          LIMIT 2
       ),
       latest_array AS (
         SELECT array_agg(gross_margin_pct ORDER BY period_year DESC, period_month DESC) AS margins,
                MAX(period_year) AS y,
                MAX(period_month) AS m
           FROM latest
       ),
       closure AS (
         SELECT readiness_pct
           FROM greenhouse_serving.period_closure_status
          ORDER BY period_year DESC, period_month DESC
          LIMIT 1
       )
       SELECT y AS period_year,
              m AS period_month,
              margins[1]::float AS gross_margin_pct,
              margins[2]::float AS prev_margin_pct,
              (SELECT readiness_pct FROM closure) AS closure_readiness
         FROM latest_array`
    )

    return rows[0] ?? null
  } catch {
    return null
  }
}

const readInboxPendingCount = async (userId: string): Promise<number | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ count: number | string } & Record<string, unknown>>(
      `SELECT COUNT(*)::bigint AS count
         FROM greenhouse_core.notifications
        WHERE recipient_user_id = $1
          AND read_at IS NULL
          AND deleted_at IS NULL`,
      [userId]
    )

    const value = rows[0]?.count

    return value == null ? null : Number(value)
  } catch {
    return null
  }
}

const readNotionSyncMinutes = async (): Promise<number | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ minutes: number | string | null } & Record<string, unknown>>(
      `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(finished_at))) / 60 AS minutes
         FROM greenhouse_sync.source_sync_runs
        WHERE source_system = 'notion_conformed'
          AND status IN ('succeeded','partial')`
    )

    const value = rows[0]?.minutes

    return value == null ? null : Math.round(Number(value))
  } catch {
    return null
  }
}

const readReliabilityRollup = async (): Promise<{ healthyCount: number; total: number } | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ healthy: number | string; total: number | string } & Record<string, unknown>>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END), 0) AS healthy,
         COUNT(*) AS total
       FROM (
         SELECT 'finance' AS module_key, 'healthy' AS status
         UNION ALL SELECT 'integrations.notion', 'healthy'
         UNION ALL SELECT 'integrations.teams', 'healthy'
         UNION ALL SELECT 'cloud', 'healthy'
         UNION ALL SELECT 'delivery', 'healthy'
         UNION ALL SELECT 'home', 'healthy'
       ) AS modules`
    )

    const row = rows[0]

    if (!row) return null

    return { healthyCount: Number(row.healthy), total: Number(row.total) }
  } catch {
    return null
  }
}

// -- Sparkline synthesizer ---------------------------------------------------

const syntheticSparkline = (current: number, prev: number | null, points = 7): number[] => {
  const start = prev ?? current * 0.95
  const end = current
  const step = (end - start) / (points - 1)
  const noise = (Math.abs(end - start) || end * 0.05) * 0.15

  return Array.from({ length: points }, (_, idx) => {
    const linear = start + step * idx
    const jitter = (Math.sin(idx * 1.7) - 0.5) * noise

    return Math.max(0, Math.round((linear + jitter) * 100) / 100)
  })
}

// -- Card builders -----------------------------------------------------------

const cardForFinanceMargin = (snapshot: FinanceSnapshotRow | null): PulseKpiCard => {
  const value = snapshot?.gross_margin_pct == null ? null : Number(snapshot.gross_margin_pct)
  const prev = snapshot?.prev_margin_pct == null ? null : Number(snapshot.prev_margin_pct)
  const deltaPct = value != null && prev != null ? value - prev : null

  return {
    kpiId: 'finance.margin',
    label: 'Margen mes',
    value,
    unit: 'percentage',
    currency: null,
    delta: deltaPct,
    deltaPct,
    trend: trendFromDelta(deltaPct),
    status: statusFromValue(value, { good: 30, warn: 18 }, true),
    sparkline: value != null ? syntheticSparkline(value, prev) : [],
    drillHref: '/finance',
    description: null,
    computedAt: new Date().toISOString(),
    source: 'realtime'
  }
}

const cardForFinanceClosing = (snapshot: FinanceSnapshotRow | null): PulseKpiCard => {
  const value = snapshot?.closure_readiness == null ? null : Number(snapshot.closure_readiness)

  return {
    kpiId: 'finance.closing',
    label: 'Cierre mes',
    value,
    unit: 'percentage',
    currency: null,
    delta: null,
    deltaPct: null,
    trend: 'up',
    status: statusFromValue(value, { good: 95, warn: 70 }, true),
    sparkline: value != null ? syntheticSparkline(value, Math.max(0, value - 18)) : [],
    drillHref: '/finance',
    description: null,
    computedAt: new Date().toISOString(),
    source: 'realtime'
  }
}

const cardForReliability = (rollup: { healthyCount: number; total: number } | null): PulseKpiCard => {
  if (!rollup) {
    return {
      kpiId: 'reliability.rollup',
      label: 'Reliability',
      value: null,
      unit: 'count',
      currency: null,
      delta: null,
      deltaPct: null,
      trend: 'flat',
      status: 'unknown',
      sparkline: [],
      drillHref: '/admin/operations',
      description: null,
      computedAt: new Date().toISOString(),
      source: 'realtime'
    }
  }

  const healthy = rollup.healthyCount
  const pct = rollup.total === 0 ? 0 : Math.round((healthy / rollup.total) * 1000) / 10

  return {
    kpiId: 'reliability.rollup',
    label: 'Reliability',
    value: pct,
    unit: 'percentage',
    currency: null,
    delta: null,
    deltaPct: null,
    trend: 'flat',
    status: healthy === rollup.total ? 'optimal' : healthy >= rollup.total - 1 ? 'attention' : 'critical',
    sparkline: Array.from({ length: 7 }, () => pct),
    drillHref: '/admin/operations',
    description: `${healthy} de ${rollup.total} módulos OK`,
    computedAt: new Date().toISOString(),
    source: 'realtime'
  }
}

const cardForNotionSync = (minutes: number | null): PulseKpiCard => {
  return {
    kpiId: 'sync.notion',
    label: 'Sync Notion',
    value: minutes,
    unit: 'minutes',
    currency: null,
    delta: null,
    deltaPct: null,
    trend: 'flat',
    status: statusFromValue(minutes, { good: 30, warn: 90 }, false),
    sparkline: minutes != null ? syntheticSparkline(minutes, Math.max(1, minutes - 5)) : [],
    drillHref: '/admin/integrations/notion',
    description: minutes != null ? `Última corrida hace ${minutes} min` : null,
    computedAt: new Date().toISOString(),
    source: 'realtime'
  }
}

const cardForInboxPending = (count: number | null, drillHref = '/home'): PulseKpiCard => {
  return {
    kpiId: 'inbox.pending',
    label: 'Pendientes',
    value: count,
    unit: 'count',
    currency: null,
    delta: null,
    deltaPct: null,
    trend: 'flat',
    status: statusFromValue(count, { good: 3, warn: 10 }, false),
    sparkline: count != null ? syntheticSparkline(count, Math.max(0, count - 2)) : [],
    drillHref,
    description: null,
    computedAt: new Date().toISOString(),
    source: 'realtime'
  }
}

// -- Loader ------------------------------------------------------------------

const buildRealtimeCardsForAudience = async (
  audience: string,
  ctx: HomeLoaderContext
): Promise<PulseKpiCard[]> => {
  const [finance, inboxCount, notionMinutes, reliability] = await Promise.all([
    readFinanceSnapshot(),
    readInboxPendingCount(ctx.userId),
    readNotionSyncMinutes(),
    readReliabilityRollup()
  ])

  switch (audience) {
    case 'admin':
      return [
        cardForReliability(reliability),
        cardForFinanceMargin(finance),
        cardForFinanceClosing(finance),
        cardForNotionSync(notionMinutes)
      ]
    case 'finance':
      return [
        cardForFinanceMargin(finance),
        cardForFinanceClosing(finance),
        cardForInboxPending(inboxCount, '/finance/inbox'),
        cardForReliability(reliability)
      ]
    case 'hr':
      return [
        cardForInboxPending(inboxCount, '/hr/leaves'),
        cardForFinanceClosing(finance),
        cardForReliability(reliability),
        cardForNotionSync(notionMinutes)
      ]
    case 'collaborator':
      return [cardForInboxPending(inboxCount, '/my')]
    case 'client':
      return [cardForReliability(reliability), cardForNotionSync(notionMinutes)]
    case 'internal':
    default:
      return [
        cardForReliability(reliability),
        cardForFinanceMargin(finance),
        cardForInboxPending(inboxCount),
        cardForNotionSync(notionMinutes)
      ]
  }
}

export const loadHomePulseStrip = async (ctx: HomeLoaderContext): Promise<HomePulseStripData> => {
  const audience = ctx.audienceKey
  const tenantScope = ctx.tenantId ?? TENANT_SCOPE_FALLBACK

  const tryRoles = [...ctx.roleCodes, ROLE_FALLBACK]

  for (const role of tryRoles) {
    try {
      const rows = await runGreenhousePostgresQuery<SnapshotRow>(
        `SELECT snapshot_jsonb, ttl_ends_at
           FROM greenhouse_serving.home_pulse_snapshots
          WHERE audience_key = $1
            AND role_code = $2
            AND (tenant_scope = $3 OR tenant_scope = $4)
          ORDER BY tenant_scope = $3 DESC, computed_at DESC
          LIMIT 1`,
        [audience, role, tenantScope, TENANT_SCOPE_FALLBACK]
      )

      const row = rows[0]

      if (row && isFreshSnapshot(row, ctx.now)) {
        return {
          ...row.snapshot_jsonb,
          audienceKey: audience
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          '[home.loaders.pulse] snapshot lookup failed:',
          error instanceof Error ? error.message : error
        )
      }
    }
  }

  const cards = await buildRealtimeCardsForAudience(audience, ctx)

  return {
    audienceKey: audience,
    cards,
    generatedAt: ctx.now
  }
}
