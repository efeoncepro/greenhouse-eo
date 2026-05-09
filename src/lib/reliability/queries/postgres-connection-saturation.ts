import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-846 Slice 6 — Reliability signal: PostgreSQL connection saturation.
 *
 * **Es la señal data-driven que dispara V2 deployment** del PgBouncer multiplexer
 * (TASK-847 contingente). Sin esta señal, V1 (ALTER ROLE idle_session_timeout +
 * runtime-aware pool sizing) opera ciegas.
 *
 * **Cómo funciona el detect**:
 *
 *   Cuenta `pg_stat_activity` filas no-system y compara contra
 *   `max_connections` (no `setting`, valor real activo) menos
 *   `superuser_reserved_connections`.
 *
 *     usable_max = max_connections - superuser_reserved_connections
 *     usage_pct  = 100 * total_connections / usable_max
 *
 * **Steady state esperado** (V1 deployed):
 *   - 25-35% utilization at current load
 *   - Tras Slice 1 ALTER ROLE, idle leak está cerrado
 *   - Tras Slice 3 runtime-aware pool, demand está acotado
 *
 * **Thresholds**:
 *   - ok:       < 60%
 *   - warning:  60-79%  (V2 deployment se evalúa)
 *   - error:    >= 80%  (V2 deployment urgente — TASK-847)
 *
 * **Defense-in-depth context** (ADR `GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1`):
 *   1. ALTER ROLE idle_session_timeout (PG-side, persistente cross-restart)
 *   2. runtime-aware pool sizing (Vercel max=3, Cloud Run max=15)
 *   3. THIS SIGNAL (data-driven trigger para V2 deployment)
 *
 * Pattern reference: TASK-774 `account-balances-fx-drift.ts`, TASK-844
 * `cloud-run-silent-observability.ts`.
 */
export const POSTGRES_CONNECTION_SATURATION_SIGNAL_ID =
  'runtime.postgres.connection_saturation'

const WARNING_THRESHOLD_PCT = 60
const ERROR_THRESHOLD_PCT = 80

const SATURATION_QUERY = `
  WITH config AS (
    SELECT
      (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_conn,
      (SELECT setting::int FROM pg_settings WHERE name = 'superuser_reserved_connections') AS reserved
  ),
  activity AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE state = 'active') AS active,
      COUNT(*) FILTER (WHERE state = 'idle') AS idle,
      COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_tx,
      COUNT(*) FILTER (WHERE usename = 'greenhouse_app') AS app_conns,
      COUNT(*) FILTER (WHERE usename = 'greenhouse_ops') AS ops_conns,
      COALESCE(MAX(EXTRACT(EPOCH FROM NOW() - state_change))::int, 0) AS max_idle_seconds
    FROM pg_stat_activity
    WHERE datname IS NOT NULL
  )
  SELECT
    config.max_conn,
    config.reserved,
    GREATEST(config.max_conn - config.reserved, 1) AS usable_max,
    activity.total,
    activity.active,
    activity.idle,
    activity.idle_in_tx,
    activity.app_conns,
    activity.ops_conns,
    activity.max_idle_seconds,
    ROUND(100.0 * activity.total / GREATEST(config.max_conn - config.reserved, 1), 1) AS usage_pct
  FROM config, activity
`

export interface PostgresConnectionSaturationSnapshot {
  maxConn: number
  reserved: number
  usableMax: number
  total: number
  active: number
  idle: number
  idleInTx: number
  appConns: number
  opsConns: number
  maxIdleSeconds: number
  usagePct: number
}

export const getPostgresConnectionSaturationSnapshot =
  async (): Promise<PostgresConnectionSaturationSnapshot> => {
    const rows = await query<{
      max_conn: number
      reserved: number
      usable_max: number
      total: number
      active: number
      idle: number
      idle_in_tx: number
      app_conns: number
      ops_conns: number
      max_idle_seconds: number
      usage_pct: number | string
    }>(SATURATION_QUERY)

    const row = rows[0]

    if (!row) {
      throw new Error('postgres-connection-saturation: empty result from pg_stat_activity')
    }

    return {
      maxConn: Number(row.max_conn),
      reserved: Number(row.reserved),
      usableMax: Number(row.usable_max),
      total: Number(row.total),
      active: Number(row.active),
      idle: Number(row.idle),
      idleInTx: Number(row.idle_in_tx),
      appConns: Number(row.app_conns),
      opsConns: Number(row.ops_conns),
      maxIdleSeconds: Number(row.max_idle_seconds),
      usagePct: Number(row.usage_pct)
    }
  }

const resolveSeverity = (
  usagePct: number
): 'ok' | 'warning' | 'error' => {
  if (usagePct >= ERROR_THRESHOLD_PCT) return 'error'

  if (usagePct >= WARNING_THRESHOLD_PCT) return 'warning'

  return 'ok'
}

const buildSummary = (snapshot: PostgresConnectionSaturationSnapshot): string => {
  const { total, usableMax, usagePct, idle, maxIdleSeconds } = snapshot

  if (usagePct >= ERROR_THRESHOLD_PCT) {
    return `Saturación crítica: ${total}/${usableMax} (${usagePct}%). V2 deployment urgente — TASK-847 PgBouncer GKE.`
  }

  if (usagePct >= WARNING_THRESHOLD_PCT) {
    return `Saturación elevada: ${total}/${usableMax} (${usagePct}%). Evaluar V2 deployment si sustained > 24h.`
  }

  if (idle >= 30 && maxIdleSeconds > 600) {
    return `Saturación OK (${usagePct}%) pero ${idle} idle conns con max age ${maxIdleSeconds}s. Verificar ALTER ROLE idle_session_timeout activo.`
  }

  return `Saturación OK: ${total}/${usableMax} (${usagePct}%).`
}

export const getPostgresConnectionSaturationSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const snapshot = await getPostgresConnectionSaturationSnapshot()
      const severity = resolveSeverity(snapshot.usagePct)

      return {
        signalId: POSTGRES_CONNECTION_SATURATION_SIGNAL_ID,
        moduleKey: 'cloud',
        kind: 'runtime',
        source: 'getPostgresConnectionSaturationSignal',
        label: 'PostgreSQL connection saturation',
        severity,
        summary: buildSummary(snapshot),
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'usage_pct',
            value: String(snapshot.usagePct)
          },
          {
            kind: 'metric',
            label: 'total_conns',
            value: String(snapshot.total)
          },
          {
            kind: 'metric',
            label: 'usable_max',
            value: String(snapshot.usableMax)
          },
          {
            kind: 'metric',
            label: 'idle',
            value: String(snapshot.idle)
          },
          {
            kind: 'metric',
            label: 'idle_in_transaction',
            value: String(snapshot.idleInTx)
          },
          {
            kind: 'metric',
            label: 'max_idle_seconds',
            value: String(snapshot.maxIdleSeconds)
          },
          {
            kind: 'metric',
            label: 'app_conns',
            value: String(snapshot.appConns)
          },
          {
            kind: 'metric',
            label: 'ops_conns',
            value: String(snapshot.opsConns)
          },
          {
            kind: 'sql',
            label: 'Detector',
            value: 'pg_stat_activity vs max_connections - superuser_reserved'
          },
          {
            kind: 'doc',
            label: 'ADR',
            value: 'docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md'
          },
          {
            kind: 'doc',
            label: 'V2 trigger',
            value:
              'docs/tasks/to-do/TASK-847-postgres-pgbouncer-gke-v2-deployment.md ' +
              `(activar si usage_pct >= ${WARNING_THRESHOLD_PCT}% sustained > 24h)`
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'cloud', {
        tags: { source: 'reliability_signal_postgres_connection_saturation' }
      })

      return {
        signalId: POSTGRES_CONNECTION_SATURATION_SIGNAL_ID,
        moduleKey: 'cloud',
        kind: 'runtime',
        source: 'getPostgresConnectionSaturationSignal',
        label: 'PostgreSQL connection saturation',
        severity: 'unknown',
        summary:
          'Detector falló — no se pudo evaluar saturación. Revisar Cloud Logging + Sentry domain=cloud.',
        observedAt,
        evidence: []
      }
    }
  }
