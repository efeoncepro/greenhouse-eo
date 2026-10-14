import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'
import type { PoolClient } from 'pg'

import { getDb } from '@/lib/db'

import type { MeasurementDestination, MeasurementSourceKind, PreparedMeasurement } from './contracts'

/** Borrow the source transaction; a savepoint keeps instrumentation failures UX-safe. */
export const enqueueMeasurementConversion = async (
  client: PoolClient,
  sourceKind: MeasurementSourceKind,
  sourceId: string,
  prepared: PreparedMeasurement | null | undefined,
): Promise<void> => {
  if (!prepared) return
  await client.query('SAVEPOINT measurement_enqueue')

  try {
    // Lock the publication pointer through enqueue: a concurrent disable wins before capture,
    // or waits until this accepted occurrence is persisted; dispatch checks again before HTTP.
    const authorized = await client.query(
      `SELECT p.policy_id FROM greenhouse_growth.measurement_policy p
       JOIN greenhouse_growth.measurement_policy_revision r ON r.revision_id=p.published_revision_id
       WHERE r.revision_id=$1 AND r.state='published' FOR SHARE OF p`, [prepared.policyRevisionId],
    )

    if (!authorized.rows.length) { await client.query('RELEASE SAVEPOINT measurement_enqueue');

return }

    const result = await client.query<{ event_id: string }>(
      `INSERT INTO greenhouse_growth.measurement_conversion
         (event_id, source_kind, source_id, occurred_at, consent_snapshot_json, encrypted_payload_json, policy_revision_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::uuid)
       ON CONFLICT (source_kind, source_id) DO NOTHING RETURNING event_id`,
      [prepared.eventId, sourceKind, sourceId, prepared.occurredAt, JSON.stringify(prepared.consent), JSON.stringify(prepared.encryptedPayload), prepared.policyRevisionId],
    )

    if (result.rows[0]) {
      for (const destination of prepared.destinations) {
        await client.query(
          `INSERT INTO greenhouse_growth.measurement_delivery (event_id, destination)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [prepared.eventId, destination],
        )
      }
    }

    await client.query('RELEASE SAVEPOINT measurement_enqueue')
  } catch {
    await client.query('ROLLBACK TO SAVEPOINT measurement_enqueue')
    await client.query('RELEASE SAVEPOINT measurement_enqueue')
    console.warn('growth_measurement_enqueue_failed', { sourceKind })
  }
}

export interface ClaimedMeasurementDelivery {
  policy_revision_id: string | null
  event_id: string
  destination: MeasurementDestination
  attempts: number
  lease_token: string
  occurred_at: Date | string
  encrypted_payload_json: PreparedMeasurement['encryptedPayload']
}

export const claimMeasurementDeliveries = async (destinations: MeasurementDestination[], limit: number) => {
  if (!destinations.length) return []
  const db = await getDb()
  const lease = randomUUID()

  const results = await sql<ClaimedMeasurementDelivery>`
    WITH picked AS (
      SELECT d.event_id, d.destination
      FROM greenhouse_growth.measurement_delivery d
      JOIN greenhouse_growth.measurement_conversion c USING (event_id)
      WHERE d.destination IN (${sql.join(destinations)})
        AND c.occurred_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND d.attempts < 5
        AND ((d.state = 'queued' AND d.next_attempt_at <= CURRENT_TIMESTAMP)
          OR (d.state = 'sending' AND d.lease_until < CURRENT_TIMESTAMP))
      ORDER BY d.next_attempt_at
      LIMIT ${limit} FOR UPDATE OF d SKIP LOCKED
    ), claimed AS (
      UPDATE greenhouse_growth.measurement_delivery d
      SET state = 'sending', attempts = attempts + 1, lease_token = ${lease}::uuid,
          lease_until = CURRENT_TIMESTAMP + INTERVAL '2 minutes', updated_at = CURRENT_TIMESTAMP
      FROM picked p WHERE d.event_id = p.event_id AND d.destination = p.destination
      RETURNING d.*
    )
    SELECT d.event_id, d.destination, d.attempts, d.lease_token,
           c.occurred_at, c.encrypted_payload_json, c.policy_revision_id
    FROM claimed d JOIN greenhouse_growth.measurement_conversion c USING (event_id)
  `.execute(db)

  return results.rows
}

export const finishMeasurementDelivery = async (
  row: ClaimedMeasurementDelivery,
  outcome: { httpStatus: number | null; success: boolean; retryable: boolean; errorClass: string | null },
) => {
  const db = await getDb()
  const state = outcome.success ? 'http_accepted' : outcome.retryable && row.attempts < 5 ? 'queued' : 'dead_letter'
  const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(0, row.attempts - 1))

  const result = await sql`
    UPDATE greenhouse_growth.measurement_delivery
    SET state = ${state}, http_status = ${outcome.httpStatus}, safe_error_class = ${outcome.errorClass},
        next_attempt_at = CURRENT_TIMESTAMP + make_interval(secs => ${delaySeconds}),
        lease_token = NULL, lease_until = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE event_id = ${row.event_id}::uuid AND destination = ${row.destination}
      AND state = 'sending' AND lease_token = ${row.lease_token}::uuid
  `.execute(db)

  return result.numAffectedRows === 1n
}

export const expireMeasurementDeliveries = async () => {
  const db = await getDb()

  await sql`
    UPDATE greenhouse_growth.measurement_delivery d
    SET state = 'dead_letter', safe_error_class = 'retry_window_expired',
        lease_token = NULL, lease_until = NULL, updated_at = CURRENT_TIMESTAMP
    FROM greenhouse_growth.measurement_conversion c
    WHERE d.event_id = c.event_id AND d.state IN ('queued', 'sending')
      AND (d.state <> 'sending' OR d.lease_until < CURRENT_TIMESTAMP)
      AND (c.occurred_at <= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        OR (d.attempts >= 5 AND (d.state <> 'sending' OR d.lease_until < CURRENT_TIMESTAMP)))
  `.execute(db)
  // Delete the encrypted matching material after 48h; retain only operational receipts.
  await sql`
    UPDATE greenhouse_growth.measurement_conversion
    SET encrypted_payload_json = NULL
    WHERE occurred_at < CURRENT_TIMESTAMP - INTERVAL '48 hours' AND encrypted_payload_json IS NOT NULL
  `.execute(db)
}
