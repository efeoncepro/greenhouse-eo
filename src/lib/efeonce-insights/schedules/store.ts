import 'server-only'

/**
 * TASK-1848 — acceso a datos de la recurrencia. Escribe sólo `greenhouse_insights.insight_schedule*`
 * y purga (retención) `insight_share_access_events` / `insight_share_rate_buckets`.
 */

import type { InsightActorKind } from '../contracts/states'
import { runInsightsQuery, toIso, type InsightsDbClient } from '../stores/db'
import type { InsightScheduleCadence } from '../window'

import type {
  InsightScheduleOccurrenceRecord,
  InsightScheduleOccurrenceState,
  InsightSchedulePauseReason,
  InsightScheduleRecord,
  InsightScheduleState
} from './contracts'

const SCHEDULE_COLUMNS = `schedule_id, organization_id, schedule_version, state, label, cadence, time_zone, consolidation_days,
  catch_up_limit, request_template, review_policy, authorized_by_actor_kind, authorized_by_user_id, activated_at, paused_at,
  pause_reason, retired_at, created_at, updated_at`

const OCCURRENCE_COLUMNS = `occurrence_id, schedule_id, schedule_version, organization_id, period_start::text AS period_start,
  period_end_exclusive::text AS period_end_exclusive, state, edition_id, render_run_id, failure_code, attempts, created_at, updated_at`

const mapSchedule = (row: Record<string, unknown>): InsightScheduleRecord => ({
  scheduleId: row.schedule_id as string,
  organizationId: row.organization_id as string,
  scheduleVersion: Number(row.schedule_version),
  state: row.state as InsightScheduleState,
  label: row.label as string,
  cadence: row.cadence as InsightScheduleCadence,
  timeZone: row.time_zone as string,
  consolidationDays: Number(row.consolidation_days),
  catchUpLimit: Number(row.catch_up_limit),
  requestTemplate: (row.request_template as Record<string, unknown>) ?? {},
  reviewPolicy: 'draft_for_review',
  authorizedByActorKind: row.authorized_by_actor_kind as InsightActorKind,
  authorizedByUserId: row.authorized_by_user_id as string,
  activatedAt: toIso(row.activated_at),
  pausedAt: toIso(row.paused_at),
  pauseReason: (row.pause_reason as InsightSchedulePauseReason | null) ?? null,
  retiredAt: toIso(row.retired_at),
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

const mapOccurrence = (row: Record<string, unknown>): InsightScheduleOccurrenceRecord => ({
  occurrenceId: row.occurrence_id as string,
  scheduleId: row.schedule_id as string,
  scheduleVersion: Number(row.schedule_version),
  organizationId: row.organization_id as string,
  periodStart: row.period_start as string,
  periodEndExclusive: row.period_end_exclusive as string,
  state: row.state as InsightScheduleOccurrenceState,
  editionId: (row.edition_id as string | null) ?? null,
  renderRunId: (row.render_run_id as string | null) ?? null,
  failureCode: (row.failure_code as string | null) ?? null,
  attempts: Number(row.attempts ?? 0),
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

export const insertInsightSchedule = async (
  client: InsightsDbClient,
  input: {
    organizationId: string
    label: string
    cadence: InsightScheduleCadence
    timeZone: string
    consolidationDays: number
    catchUpLimit: number
    requestTemplate: Record<string, unknown>
    authorizedByActorKind: InsightActorKind
    authorizedByUserId: string
  }
): Promise<InsightScheduleRecord> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `INSERT INTO greenhouse_insights.insight_schedules
       (organization_id, label, cadence, time_zone, consolidation_days, catch_up_limit, request_template, authorized_by_actor_kind, authorized_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     RETURNING ${SCHEDULE_COLUMNS}`,
    [input.organizationId, input.label, input.cadence, input.timeZone, input.consolidationDays, input.catchUpLimit, JSON.stringify(input.requestTemplate), input.authorizedByActorKind, input.authorizedByUserId]
  )

  return mapSchedule(rows[0]!)
}

export const getInsightSchedule = async (
  client: InsightsDbClient | undefined,
  scheduleId: string,
  options: { organizationId?: string; forUpdate?: boolean } = {}
): Promise<InsightScheduleRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `SELECT ${SCHEDULE_COLUMNS} FROM greenhouse_insights.insight_schedules
      WHERE schedule_id = $1${options.organizationId ? ' AND organization_id = $2' : ''}${options.forUpdate ? ' FOR UPDATE' : ''}`,
    options.organizationId ? [scheduleId, options.organizationId] : [scheduleId]
  )

  return rows[0] ? mapSchedule(rows[0]) : null
}

export const listInsightSchedules = async (organizationId: string): Promise<InsightScheduleRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    undefined,
    `SELECT ${SCHEDULE_COLUMNS} FROM greenhouse_insights.insight_schedules
      WHERE organization_id = $1 ORDER BY created_at DESC, schedule_id COLLATE "C" DESC LIMIT 100`,
    [organizationId]
  )

  return rows.map(mapSchedule)
}

export const listActiveInsightSchedules = async (): Promise<InsightScheduleRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    undefined,
    `SELECT ${SCHEDULE_COLUMNS} FROM greenhouse_insights.insight_schedules
      WHERE state = 'active' ORDER BY created_at, schedule_id COLLATE "C" LIMIT 500`
  )

  return rows.map(mapSchedule)
}

export const countActiveInsightSchedules = async (client: InsightsDbClient, organizationId: string): Promise<number> => {
  const rows = await runInsightsQuery<{ total: string }>(
    client,
    `SELECT count(*)::text AS total FROM greenhouse_insights.insight_schedules WHERE organization_id = $1 AND state = 'active'`,
    [organizationId]
  )

  return Number(rows[0]?.total ?? 0)
}

export const transitionInsightSchedule = async (
  client: InsightsDbClient,
  input: {
    scheduleId: string
    fromStates: InsightScheduleState[]
    state: InsightScheduleState
    pauseReason?: InsightSchedulePauseReason | null
    authorizedByActorKind?: InsightActorKind
    authorizedByUserId?: string
  }
): Promise<InsightScheduleRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `UPDATE greenhouse_insights.insight_schedules
        SET state = $2,
            activated_at = CASE WHEN $2 = 'active' THEN now() ELSE activated_at END,
            paused_at = CASE WHEN $2 = 'paused' THEN now() ELSE NULL END,
            pause_reason = CASE WHEN $2 = 'paused' THEN $4 ELSE NULL END,
            retired_at = CASE WHEN $2 = 'retired' THEN now() ELSE retired_at END,
            authorized_by_actor_kind = COALESCE($5, authorized_by_actor_kind),
            authorized_by_user_id = COALESCE($6, authorized_by_user_id),
            updated_at = now()
      WHERE schedule_id = $1 AND state = ANY($3::text[])
      RETURNING ${SCHEDULE_COLUMNS}`,
    [input.scheduleId, input.state, input.fromStates, input.pauseReason ?? null, input.authorizedByActorKind ?? null, input.authorizedByUserId ?? null]
  )

  return rows[0] ? mapSchedule(rows[0]) : null
}

/**
 * Ocurrencia única por (schedule, versión, período). `NOT EXISTS` evita quemar el DEFAULT en el
 * caso común (ISSUE-172) y el índice único es la guarda ante dos ticks concurrentes.
 */
export const ensureInsightScheduleOccurrence = async (
  input: {
    scheduleId: string
    scheduleVersion: number
    organizationId: string
    periodStart: string
    periodEndExclusive: string
  },
  client?: InsightsDbClient
): Promise<InsightScheduleOccurrenceRecord> => {
  await runInsightsQuery(
    client,
    `INSERT INTO greenhouse_insights.insight_schedule_occurrences (schedule_id, schedule_version, organization_id, period_start, period_end_exclusive)
     SELECT $1, $2, $3, $4::date, $5::date
      WHERE NOT EXISTS (
        SELECT 1 FROM greenhouse_insights.insight_schedule_occurrences
         WHERE schedule_id = $1 AND schedule_version = $2 AND period_start = $4::date
      )
     ON CONFLICT DO NOTHING`,
    [input.scheduleId, input.scheduleVersion, input.organizationId, input.periodStart, input.periodEndExclusive]
  )

  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `SELECT ${OCCURRENCE_COLUMNS} FROM greenhouse_insights.insight_schedule_occurrences
      WHERE schedule_id = $1 AND schedule_version = $2 AND period_start = $3::date`,
    [input.scheduleId, input.scheduleVersion, input.periodStart]
  )

  return mapOccurrence(rows[0]!)
}

/**
 * Claim de una ocurrencia para generar: `pending`, o `generating` caída (más vieja que el umbral),
 * con cupo de intentos. Dos ticks concurrentes: sólo uno la obtiene.
 */
export const claimInsightScheduleOccurrence = async (
  occurrenceId: string,
  staleMinutes: number,
  maxAttempts: number,
  client?: InsightsDbClient
): Promise<InsightScheduleOccurrenceRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `UPDATE greenhouse_insights.insight_schedule_occurrences
        SET state = 'generating', attempts = attempts + 1, updated_at = now()
      WHERE occurrence_id = $1
        AND attempts < $3
        AND (state = 'pending' OR (state = 'generating' AND updated_at < now() - make_interval(mins => $2)))
      RETURNING ${OCCURRENCE_COLUMNS}`,
    [occurrenceId, staleMinutes, maxAttempts]
  )

  return rows[0] ? mapOccurrence(rows[0]) : null
}

export const finishInsightScheduleOccurrence = async (input: {
  occurrenceId: string
  state: InsightScheduleOccurrenceState
  editionId?: string | null
  renderRunId?: string | null
  failureCode?: string | null
}): Promise<void> => {
  await runInsightsQuery(
    undefined,
    `UPDATE greenhouse_insights.insight_schedule_occurrences
        SET state = $2, edition_id = COALESCE($3, edition_id), render_run_id = COALESCE($4, render_run_id), failure_code = $5, updated_at = now()
      WHERE occurrence_id = $1`,
    [input.occurrenceId, input.state, input.editionId ?? null, input.renderRunId ?? null, input.failureCode ?? null]
  )
}

export const listRecentInsightScheduleOccurrences = async (scheduleId: string, limit = 12): Promise<InsightScheduleOccurrenceRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    undefined,
    `SELECT ${OCCURRENCE_COLUMNS} FROM greenhouse_insights.insight_schedule_occurrences
      WHERE schedule_id = $1 ORDER BY period_start DESC, schedule_version DESC LIMIT $2`,
    [scheduleId, limit]
  )

  return rows.map(mapOccurrence)
}

export const countRecentFailedOccurrences = async (scheduleId: string, scheduleVersion: number): Promise<number> => {
  const rows = await runInsightsQuery<{ failed: string }>(
    undefined,
    `SELECT count(*)::text AS failed FROM (
        SELECT state FROM greenhouse_insights.insight_schedule_occurrences
         WHERE schedule_id = $1 AND schedule_version = $2
         ORDER BY period_start DESC LIMIT 3
      ) recent WHERE state = 'failed'`,
    [scheduleId, scheduleVersion]
  )

  return Number(rows[0]?.failed ?? 0)
}

/** Retención del access log y de las cubetas del reader público (§10). */
export const purgeInsightShareAccessData = async (retentionDays: number): Promise<{ accessEvents: number; rateBuckets: number }> => {
  const events = await runInsightsQuery<{ total: string }>(
    undefined,
    `WITH purged AS (
       DELETE FROM greenhouse_insights.insight_share_access_events
        WHERE created_at < now() - make_interval(days => $1)
        RETURNING 1
     ) SELECT count(*)::text AS total FROM purged`,
    [retentionDays]
  )

  const buckets = await runInsightsQuery<{ total: string }>(
    undefined,
    `WITH purged AS (
       DELETE FROM greenhouse_insights.insight_share_rate_buckets
        WHERE window_started_at < now() - interval '1 day'
        RETURNING 1
     ) SELECT count(*)::text AS total FROM purged`
  )

  return { accessEvents: Number(events[0]?.total ?? 0), rateBuckets: Number(buckets[0]?.total ?? 0) }
}
