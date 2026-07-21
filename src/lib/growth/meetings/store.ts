import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

export interface MeetingSurfaceAuthority {
  surfaceId: string
  schedulerKey: string
  origins: string[]
  fallbackUrl: string
  defaultTimezone: string
  defaultLocale: string
}

interface SurfaceRow extends Record<string, unknown> {
  surface_id: string
  scheduler_key: string
  origin_allowlist_json: unknown
  fallback_url: string
  default_timezone: string
  default_locale: string
}

export const getMeetingSurfaceAuthority = async (
  surfaceId: string,
  schedulerKey: string,
): Promise<MeetingSurfaceAuthority | null> => {
  const rows = await query<SurfaceRow>(
    `SELECT b.surface_id, b.scheduler_key, s.origin_allowlist_json,
            b.fallback_url, b.default_timezone, b.default_locale
       FROM greenhouse_growth.meeting_surface_binding b
       JOIN greenhouse_growth.form_host_surface s ON s.surface_id = b.surface_id
      WHERE b.surface_id = $1
        AND b.scheduler_key = $2
        AND b.status = 'active'
        AND s.status = 'active'
      LIMIT 1`,
    [surfaceId, schedulerKey],
  )

  const row = rows[0]

  if (!row) return null

  return {
    surfaceId: row.surface_id,
    schedulerKey: row.scheduler_key,
    origins: Array.isArray(row.origin_allowlist_json)
      ? row.origin_allowlist_json.filter((origin): origin is string => typeof origin === 'string')
      : [],
    fallbackUrl: row.fallback_url,
    defaultTimezone: row.default_timezone,
    defaultLocale: row.default_locale,
  }
}

export type MeetingExecutionState =
  | 'claimed'
  | 'failed_prewrite'
  | 'provider_dispatched'
  | 'succeeded'
  | 'failed_terminal'
  | 'ambiguous'
  | 'provider_created_invalid'

interface ExecutionRow {
  execution_id: string
  request_fingerprint: string
  state: MeetingExecutionState
  requested_start_at: string | Date
  requested_duration_ms: number
  requested_timezone: string
  safe_error_category: string | null
}

export type MeetingClaimResult =
  | { kind: 'claimed'; executionId: string }
  | { kind: 'replay'; executionId: string; startsAt: string; durationMs: number; timezone: string }
  | { kind: 'conflict' }
  | { kind: 'in_progress_or_unknown'; state: MeetingExecutionState }
  | { kind: 'rate_limited' }

export interface MeetingClaimInput {
  surfaceId: string
  schedulerKey: string
  idempotencyKeyHmac: string
  requestFingerprint: string
  bookingFingerprint: string
  emailHmac: string
  ipHmac: string | null
  digestKeyVersion: string
  requestedStartAt: string
  requestedDurationMs: number
  requestedTimezone: string
  requestedLocale: string
  attribution: Record<string, string>
  emailLimit: number
  ipLimit: number
}

class MeetingRateLimitedError extends Error {}

const consumeRateBucket = async (
  client: PoolClient,
  input: {
    action: 'book'
    surfaceId: string
    schedulerKey: string
    subjectKind: 'email' | 'ip'
    subjectHmac: string
    keyVersion: string
    limit: number
  },
): Promise<boolean> => {
  const result = await client.query<{ hit_count: number }>(
    `INSERT INTO greenhouse_growth.meeting_rate_limit_bucket (
       action, surface_id, scheduler_key, subject_kind, subject_hmac,
       digest_key_version, bucket_start, hit_count
     ) VALUES ($1, $2, $3, $4, $5, $6, date_trunc('day', CURRENT_TIMESTAMP), 1)
     ON CONFLICT (action, surface_id, scheduler_key, subject_kind, subject_hmac, bucket_start)
     DO UPDATE SET
       hit_count = meeting_rate_limit_bucket.hit_count + 1,
       updated_at = CURRENT_TIMESTAMP
     WHERE meeting_rate_limit_bucket.hit_count < $7
     RETURNING hit_count`,
    [
      input.action,
      input.surfaceId,
      input.schedulerKey,
      input.subjectKind,
      input.subjectHmac,
      input.keyVersion,
      input.limit,
    ],
  )

  return result.rowCount === 1
}

const readExecutionByKey = async (client: PoolClient, input: MeetingClaimInput): Promise<ExecutionRow | null> => {
  const result = await client.query<ExecutionRow>(
    `SELECT execution_id, request_fingerprint, state, requested_start_at,
            requested_duration_ms, requested_timezone, safe_error_category
       FROM greenhouse_growth.meeting_booking_execution
      WHERE surface_id = $1 AND scheduler_key = $2 AND idempotency_key_hmac = $3
      LIMIT 1`,
    [input.surfaceId, input.schedulerKey, input.idempotencyKeyHmac],
  )

  return result.rows[0] ?? null
}

const iso = (value: string | Date): string => new Date(value).toISOString()

export const claimMeetingBooking = async (input: MeetingClaimInput): Promise<MeetingClaimResult> => {
  try {
    return await withTransaction(async client => {
    const existing = await readExecutionByKey(client, input)

    if (existing) {
      if (existing.request_fingerprint !== input.requestFingerprint) return { kind: 'conflict' as const }

      if (existing.state === 'succeeded') {
        await client.query(
          `UPDATE greenhouse_growth.meeting_booking_execution
              SET replay_count = replay_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE execution_id = $1`,
          [existing.execution_id],
        )

        return {
          kind: 'replay' as const,
          executionId: existing.execution_id,
          startsAt: iso(existing.requested_start_at),
          durationMs: existing.requested_duration_ms,
          timezone: existing.requested_timezone,
        }
      }

      if (existing.state !== 'failed_prewrite') {
        return { kind: 'in_progress_or_unknown' as const, state: existing.state }
      }

      const reclaimed = await client.query<{ execution_id: string }>(
        `UPDATE greenhouse_growth.meeting_booking_execution
            SET state = 'claimed', safe_outcome = NULL, safe_error_category = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE execution_id = $1 AND state = 'failed_prewrite'
          RETURNING execution_id`,
        [existing.execution_id],
      )

      if (reclaimed.rowCount !== 1) return { kind: 'in_progress_or_unknown' as const, state: existing.state }

      return { kind: 'claimed' as const, executionId: existing.execution_id }
    }

    const inserted = await client.query<{ execution_id: string }>(
      `INSERT INTO greenhouse_growth.meeting_booking_execution (
         surface_id, scheduler_key, idempotency_key_hmac, request_fingerprint,
         booking_fingerprint, email_hmac, ip_hmac, digest_key_version,
         requested_start_at, requested_duration_ms, requested_timezone,
         requested_locale, attribution_json
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
       ON CONFLICT DO NOTHING
       RETURNING execution_id`,
      [
        input.surfaceId,
        input.schedulerKey,
        input.idempotencyKeyHmac,
        input.requestFingerprint,
        input.bookingFingerprint,
        input.emailHmac,
        input.ipHmac,
        input.digestKeyVersion,
        input.requestedStartAt,
        input.requestedDurationMs,
        input.requestedTimezone,
        input.requestedLocale,
        JSON.stringify(input.attribution),
      ],
    )

    if (inserted.rowCount !== 1 || !inserted.rows[0]) {
      const raced = await readExecutionByKey(client, input)

      if (!raced || raced.request_fingerprint !== input.requestFingerprint) return { kind: 'conflict' as const }

      return { kind: 'in_progress_or_unknown' as const, state: raced.state }
    }

    const emailAllowed = await consumeRateBucket(client, {
      action: 'book',
      surfaceId: input.surfaceId,
      schedulerKey: input.schedulerKey,
      subjectKind: 'email',
      subjectHmac: input.emailHmac,
      keyVersion: input.digestKeyVersion,
      limit: input.emailLimit,
    })

    const ipAllowed = !input.ipHmac || await consumeRateBucket(client, {
      action: 'book',
      surfaceId: input.surfaceId,
      schedulerKey: input.schedulerKey,
      subjectKind: 'ip',
      subjectHmac: input.ipHmac,
      keyVersion: input.digestKeyVersion,
      limit: input.ipLimit,
    })

    if (!emailAllowed || !ipAllowed) throw new MeetingRateLimitedError()

    return { kind: 'claimed' as const, executionId: inserted.rows[0].execution_id }
    })
  } catch (error) {
    if (error instanceof MeetingRateLimitedError) return { kind: 'rate_limited' }
    throw error
  }
}

export const markMeetingProviderDispatched = async (executionId: string): Promise<boolean> => {
  const rows = await query<{ execution_id: string }>(
    `UPDATE greenhouse_growth.meeting_booking_execution
        SET state = 'provider_dispatched', provider_dispatched_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE execution_id = $1 AND state = 'claimed'
      RETURNING execution_id`,
    [executionId],
  )

  return rows.length === 1
}

export const finalizeMeetingExecution = async (input: {
  executionId: string
  state: Exclude<MeetingExecutionState, 'claimed' | 'provider_dispatched'>
  safeOutcome: string
  safeErrorCategory?: string | null
  conversionReceiptHash?: string | null
}): Promise<boolean> => {
  const rows = await query<{ execution_id: string }>(
    `UPDATE greenhouse_growth.meeting_booking_execution
        SET state = $2,
            safe_outcome = $3,
            safe_error_category = $4,
            conversion_receipt_hash = $5,
            completed_at = CASE WHEN $2 IN ('succeeded','failed_terminal','provider_created_invalid') THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
      WHERE execution_id = $1
        AND state = CASE WHEN $2 = 'failed_prewrite' THEN 'claimed' ELSE 'provider_dispatched' END
      RETURNING execution_id`,
    [
      input.executionId,
      input.state,
      input.safeOutcome,
      input.safeErrorCategory ?? null,
      input.conversionReceiptHash ?? null,
    ],
  )

  return rows.length === 1
}

export type MeetingMetricKind =
  | 'availability_failed'
  | 'booking_failed'
  | 'offline_booking_detected'
  | 'duplicate_prevented'
  | 'booking_confirmed'

export const recordMeetingMetric = async (input: {
  metricKind: MeetingMetricKind
  surfaceId: string
  schedulerKey: string
}): Promise<void> => {
  try {
    await query(
      `INSERT INTO greenhouse_growth.meeting_runtime_rollup (
         metric_kind, surface_id, scheduler_key, bucket_start, observed_count
       ) VALUES ($1, $2, $3, date_trunc('hour', CURRENT_TIMESTAMP), 1)
       ON CONFLICT (metric_kind, surface_id, scheduler_key, bucket_start)
       DO UPDATE SET
         observed_count = meeting_runtime_rollup.observed_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [input.metricKind, input.surfaceId, input.schedulerKey],
    )
  } catch {
    // Telemetry must never change public booking semantics. The execution ledger
    // remains authoritative for reconciliation when this best-effort rollup fails.
  }
}
