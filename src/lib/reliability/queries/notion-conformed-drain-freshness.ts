import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

/**
 * Reliability signal for the BQ conformed → Postgres delivery drain
 * (`syncBqConformedToPostgres`, run via the daily ops-worker
 * `/notion-conformed/sync` cron). The drain owns its own `source_sync_runs`
 * row (`source_system='notion'`, `source_object_type='bq_pg_drain'`) since the
 * FK-ownership fix, so its health is observable here.
 *
 * This is the escalation backstop the FK incident (JAVASCRIPT-NEXTJS-6C) lacked:
 * if the drain starts failing or stops completing, `greenhouse_delivery.*` goes
 * stale silently. This signal surfaces that on /admin/operations instead of
 * waiting for a downstream consumer to notice.
 */
export const NOTION_CONFORMED_DRAIN_FRESHNESS_SIGNAL_ID = 'sync.notion_conformed_drain.freshness'

// Drain runs daily (Cloud Scheduler ops-notion-conformed-sync @ 7:20 AM
// Santiago). 30h allows for one missed run + clock buffer before flagging
// sustained staleness, mirroring the raw_sync window convention (TASK-841).
const DRAIN_MAX_AGE_HOURS = 30

interface DrainFreshnessRow extends Record<string, unknown> {
  latest_status: string | null
  latest_started_at: Date | string | null
  latest_finished_at: Date | string | null
  latest_notes: string | null
  latest_success_finished_at: Date | string | null
}

const QUERY_SQL = `
  WITH latest AS (
    SELECT status, started_at, finished_at, notes
    FROM greenhouse_sync.source_sync_runs
    WHERE source_system = 'notion'
      AND source_object_type = 'bq_pg_drain'
    ORDER BY started_at DESC
    LIMIT 1
  ),
  latest_success AS (
    SELECT finished_at
    FROM greenhouse_sync.source_sync_runs
    WHERE source_system = 'notion'
      AND source_object_type = 'bq_pg_drain'
      AND status = 'succeeded'
    ORDER BY started_at DESC
    LIMIT 1
  )
  SELECT
    latest.status AS latest_status,
    latest.started_at AS latest_started_at,
    latest.finished_at AS latest_finished_at,
    latest.notes AS latest_notes,
    latest_success.finished_at AS latest_success_finished_at
  FROM latest
  FULL OUTER JOIN latest_success ON TRUE
`

const toDate = (value: Date | string | null): Date | null => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const ageMinutes = (value: Date | string | null, now: Date): number | null => {
  const date = toDate(value)

  if (!date) return null

  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
}

const formatAge = (minutes: number | null) => {
  if (minutes === null) return 'sin éxito registrado'
  if (minutes < 60) return `${minutes}m`

  return `${Math.round(minutes / 60)}h`
}

export const evaluateNotionConformedDrainRows = (
  rows: DrainFreshnessRow[],
  now = new Date()
): { severity: ReliabilitySeverity; summary: string; evidence: ReliabilitySignal['evidence'] } => {
  const row = rows[0]
  const successAgeMinutes = ageMinutes(row?.latest_success_finished_at ?? null, now)
  const hasSuccessWithinWindow = successAgeMinutes !== null && successAgeMinutes <= DRAIN_MAX_AGE_HOURS * 60
  const latestFailed = row?.latest_status === 'failed' || row?.latest_status === 'partial'

  let severity: ReliabilitySeverity
  let summary: string

  if (!row || row.latest_status == null) {
    // No drain has ever run — pre-deployment or scheduler not wired.
    severity = 'error'
    summary = 'El drain BQ→PG (bq_pg_drain) no tiene ninguna corrida registrada.'
  } else if (!hasSuccessWithinWindow) {
    // Sustained staleness: no successful drain inside the window. PG delivery
    // tables are likely stale — real escalation.
    severity = 'error'
    summary = `El drain BQ→PG no completa con éxito hace ${formatAge(successAgeMinutes)} (umbral ${DRAIN_MAX_AGE_HOURS}h). greenhouse_delivery.* puede estar desactualizado.`
  } else if (latestFailed) {
    // Recent blip but a success exists within the window — recoverable next
    // cycle. Surface as warning, not a page.
    severity = 'warning'
    summary = `Última corrida del drain BQ→PG = ${row.latest_status}, pero hubo éxito hace ${formatAge(successAgeMinutes)}. Recupera en el próximo ciclo.`
  } else {
    severity = 'ok'
    summary = `Drain BQ→PG dentro de SLA (último éxito hace ${formatAge(successAgeMinutes)}).`
  }

  return {
    severity,
    summary,
    evidence: [
      { kind: 'metric', label: 'latest_status', value: row?.latest_status ?? 'missing' },
      { kind: 'metric', label: 'latest_success_age', value: formatAge(successAgeMinutes) },
      {
        kind: 'sql',
        label: 'Query',
        value: "greenhouse_sync.source_sync_runs WHERE source_system='notion' AND source_object_type='bq_pg_drain'"
      }
    ]
  }
}

export const getNotionConformedDrainFreshnessSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DrainFreshnessRow>(QUERY_SQL)
    const evaluated = evaluateNotionConformedDrainRows(rows)

    return {
      signalId: NOTION_CONFORMED_DRAIN_FRESHNESS_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'freshness',
      source: 'getNotionConformedDrainFreshnessSignal',
      label: 'Notion conformed → PG drain freshness',
      severity: evaluated.severity,
      summary: evaluated.summary,
      observedAt,
      evidence: evaluated.evidence
    }
  } catch (error) {
    captureWithDomain(error, 'sync', {
      tags: { source: 'reliability_signal_notion_conformed_drain_freshness' }
    })

    return {
      signalId: NOTION_CONFORMED_DRAIN_FRESHNESS_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'freshness',
      source: 'getNotionConformedDrainFreshnessSignal',
      label: 'Notion conformed → PG drain freshness',
      severity: 'unknown',
      summary: 'No fue posible leer el estado del drain BQ→PG desde source_sync_runs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
