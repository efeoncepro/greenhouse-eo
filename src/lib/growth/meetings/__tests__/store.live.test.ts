import { createHash, randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it } from 'vitest'

import { closeGreenhousePostgres, query } from '@/lib/db'

import { resolveMeetingPrivacyHasher } from '../privacy'
import {
  claimMeetingBooking,
  finalizeMeetingExecution,
  getMeetingSurfaceAuthority,
  markMeetingProviderDispatched,
  type MeetingClaimInput,
} from '../store'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const digest = (value: string): string => createHash('sha256').update(value).digest('hex')

describe.skipIf(!hasPgConfig)('meeting booking ledger — live PostgreSQL (TASK-1509)', () => {
  const runId = randomUUID()
  const idempotencyKeyHmac = digest(`${runId}:idempotency`)
  const bookingFingerprint = digest(`${runId}:booking`)
  const emailHmac = digest(`${runId}:email`)
  const ipHmac = digest(`${runId}:ip`)
  const receiptHash = digest(`${runId}:receipt`)

  const input: MeetingClaimInput = {
    surfaceId: 'fhsf-efeonce-lead-gen-web',
    schedulerKey: 'discovery',
    idempotencyKeyHmac,
    requestFingerprint: digest(`${runId}:request`),
    bookingFingerprint,
    emailHmac,
    ipHmac,
    digestKeyVersion: 'live-test-v1',
    requestedStartAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    requestedDurationMs: 30 * 60 * 1_000,
    requestedTimezone: 'America/Santiago',
    requestedLocale: 'es',
    attribution: { source: 'task_1509_live_test' },
    emailLimit: 10,
    ipLimit: 10,
  }

  const cleanup = async () => {
    await query(
      `DELETE FROM greenhouse_growth.meeting_rate_limit_bucket
        WHERE surface_id = $1 AND scheduler_key = $2
          AND subject_hmac = ANY($3::text[])`,
      [input.surfaceId, input.schedulerKey, [emailHmac, ipHmac]],
    )
    await query(
      `DELETE FROM greenhouse_growth.meeting_booking_execution
        WHERE surface_id = $1 AND scheduler_key = $2
          AND (idempotency_key_hmac = $3 OR booking_fingerprint = $4)`,
      [input.surfaceId, input.schedulerKey, idempotencyKeyHmac, bookingFingerprint],
    )
  }

  afterAll(async () => {
    await cleanup().catch(() => undefined)
    await closeGreenhousePostgres().catch(() => undefined)
  })

  it('serializes concurrent claims, rejects semantic conflicts and replays only after success', async () => {
    const runtimeHasher = await resolveMeetingPrivacyHasher()

    expect(runtimeHasher.keyVersion).toBe('v1')
    expect(runtimeHasher.hmac('booking', `${runId}:secret-consumer-smoke`)).toHaveLength(64)

    await cleanup()

    const pausedAuthority = await getMeetingSurfaceAuthority(input.surfaceId, input.schedulerKey)

    expect(pausedAuthority).toBeNull()

    const raced = await Promise.all([
      claimMeetingBooking(input),
      claimMeetingBooking(input),
    ])

    expect(raced.filter(result => result.kind === 'claimed')).toHaveLength(1)
    expect(raced.filter(result => result.kind === 'in_progress_or_unknown')).toHaveLength(1)

    const claimed = raced.find(result => result.kind === 'claimed')

    expect(claimed?.kind).toBe('claimed')
    if (!claimed || claimed.kind !== 'claimed') throw new Error('live claim was not acquired')

    await expect(claimMeetingBooking({
      ...input,
      requestFingerprint: digest(`${runId}:different-request`),
    })).resolves.toEqual({ kind: 'conflict' })

    await expect(claimMeetingBooking({
      ...input,
      idempotencyKeyHmac: digest(`${runId}:different-idempotency`),
    })).resolves.toEqual({ kind: 'conflict' })

    await expect(markMeetingProviderDispatched(claimed.executionId)).resolves.toBe(true)
    await expect(finalizeMeetingExecution({
      executionId: claimed.executionId,
      state: 'succeeded',
      safeOutcome: 'confirmed',
      conversionReceiptHash: receiptHash,
    })).resolves.toBe(true)

    const replay = await claimMeetingBooking(input)

    expect(replay).toMatchObject({
      kind: 'replay',
      executionId: claimed.executionId,
      durationMs: input.requestedDurationMs,
      timezone: input.requestedTimezone,
    })

    const rows = await query<{ state: string; replay_count: number; receipt_count: number }>(
      `SELECT state, replay_count,
              CASE WHEN conversion_receipt_hash IS NULL THEN 0 ELSE 1 END AS receipt_count
         FROM greenhouse_growth.meeting_booking_execution
        WHERE execution_id = $1`,
      [claimed.executionId],
    )

    expect(rows).toEqual([{ state: 'succeeded', replay_count: 1, receipt_count: 1 }])
  })
})
