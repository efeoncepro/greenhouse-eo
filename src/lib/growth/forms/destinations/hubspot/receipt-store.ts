import 'server-only'

import { sql, type QueryExecutorProvider } from 'kysely'

import { getDb } from '@/lib/db'

import { HUBSPOT_RECEIPT_MAX_CHECKS, HUBSPOT_SUBMISSION_ID_PROPERTY, isNativeHubspotSubmissionId, parseHubSpotFormReceipt, type HubSpotFormReceipt } from './receipts'

export type PendingHubspotReceipt = {
  attemptId: string
  submissionId: string
  destinationId: string
  createdAt: string | Date
  receipt: HubSpotFormReceipt
}

const ATTEMPT_ID = /^fatt-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

/** Run before any non-idempotent POST, so a missing additive migration cannot lose its attempt receipt. */
export async function assertHubSpotReceiptStorageReady(db?: QueryExecutorProvider): Promise<void> {
  await sql`SELECT provider_submission_id,provider_receipt_json
    FROM greenhouse_growth.form_destination_attempt LIMIT 0`.execute(db ?? await getDb())
}

/** Internal release configuration only; caller must verify native property/form and operator authority first.
 * Atomic opt-in preserves the published source, commercial mapping and existing measurement policy. */
export async function configureHubSpotSubmissionTracing(input: {
  destinationId: string; expectedMapping: Record<string, unknown>; enabled: boolean
}, db?: QueryExecutorProvider): Promise<boolean> {
  const mapping = input.expectedMapping

  if (!/^fdst-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.destinationId) || typeof input.enabled !== 'boolean' ||
    !mapping || mapping.portalId !== '48713323' || typeof mapping.formGuid !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(mapping.formGuid) ||
    !mapping.fieldMapping || typeof mapping.fieldMapping !== 'object' || Array.isArray(mapping.fieldMapping) ||
    (mapping.submissionIdProperty !== undefined && mapping.submissionIdProperty !== HUBSPOT_SUBMISSION_ID_PROPERTY))
    throw new Error('invalid_hubspot_receipt_destination')

  const result = await sql<{ destination_id: string }>`UPDATE greenhouse_growth.form_destination
    SET mapping_json=CASE WHEN ${input.enabled} THEN
      jsonb_set(mapping_json,'{submissionIdProperty}',${JSON.stringify(HUBSPOT_SUBMISSION_ID_PROPERTY)}::jsonb)
      ELSE mapping_json-'submissionIdProperty' END
    WHERE destination_id=${input.destinationId} AND provider='hubspot'
      AND adapter_kind='hubspot_forms_secure_submit' AND mapping_json=${JSON.stringify(mapping)}::jsonb
    RETURNING destination_id`.execute(db ?? await getDb())

  return result.rows.length === 1
}

const sameIdentity = (a: HubSpotFormReceipt, b: HubSpotFormReceipt) =>
  a.contract === b.contract && a.portalId === b.portalId && a.formGuid === b.formGuid &&
  a.markerProperty === b.markerProperty && a.markerValue === b.markerValue

/** Bounded background GET reconciliation; never retries the original secure-submit POST. */
export async function listPendingHubspotReceipts(limit = 5, db?: QueryExecutorProvider): Promise<PendingHubspotReceipt[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('invalid_hubspot_receipt_limit')

  const result = await sql<{
    attempt_id: string; submission_id: string; destination_id: string; created_at: string | Date; provider_receipt_json: unknown
  }>`SELECT attempt_id,submission_id,destination_id,created_at,provider_receipt_json
    FROM greenhouse_growth.form_destination_attempt
    WHERE provider='hubspot' AND status='succeeded' AND provider_submission_id IS NULL
      AND provider_receipt_json->>'contract'='hubspot-form-receipt.v1'
      AND provider_receipt_json->>'status'='pending'
      AND CASE WHEN provider_receipt_json->>'checks' ~ '^[0-8]$'
        THEN (provider_receipt_json->>'checks')::integer < ${HUBSPOT_RECEIPT_MAX_CHECKS} ELSE FALSE END
      AND (provider_receipt_json->>'nextCheckAt')::timestamptz <= CURRENT_TIMESTAMP
      AND created_at <= CURRENT_TIMESTAMP
    ORDER BY created_at,attempt_id LIMIT ${limit}`.execute(db ?? await getDb())

  return result.rows.flatMap(row => {
    const receipt = parseHubSpotFormReceipt(row.provider_receipt_json)

    return receipt && receipt.status === 'pending' && receipt.markerValue === row.submission_id && ATTEMPT_ID.test(row.attempt_id)
      ? [{ attemptId: row.attempt_id, submissionId: row.submission_id, destinationId: row.destination_id, createdAt: row.created_at, receipt }] : []
  })
}

/** Compare-and-swap: a concurrent/stale check cannot overwrite evidence or a terminal receipt. */
export async function saveHubspotReceiptCheck(input: {
  attemptId: string
  previous: HubSpotFormReceipt
  receipt: HubSpotFormReceipt
  nativeSubmissionId?: string
}, db?: QueryExecutorProvider): Promise<boolean> {
  const previous = parseHubSpotFormReceipt(input.previous)
  const receipt = parseHubSpotFormReceipt(input.receipt)

  if (!ATTEMPT_ID.test(input.attemptId) || !previous || !receipt || previous.status !== 'pending' ||
    previous.checks >= HUBSPOT_RECEIPT_MAX_CHECKS || receipt.checks !== previous.checks + 1 ||
    !sameIdentity(previous, receipt) || !receipt.checkedAt ||
    (receipt.status === 'pending' && receipt.checks >= HUBSPOT_RECEIPT_MAX_CHECKS) ||
    (receipt.status === 'verified' && (!isNativeHubspotSubmissionId(input.nativeSubmissionId) || receipt.paginationComplete !== true)) ||
    (receipt.status !== 'verified' && input.nativeSubmissionId !== undefined)) throw new Error('invalid_hubspot_receipt_check')

  const result = await sql<{ attempt_id: string }>`UPDATE greenhouse_growth.form_destination_attempt
    SET provider_receipt_json=${JSON.stringify(receipt)}::jsonb,
      provider_submission_id=${input.nativeSubmissionId ?? null}
    WHERE attempt_id=${input.attemptId} AND provider='hubspot' AND status='succeeded'
      AND submission_id=${previous.markerValue} AND provider_submission_id IS NULL
      AND provider_receipt_json->>'contract'=${previous.contract}
      AND provider_receipt_json->>'status'='pending'
      AND provider_receipt_json=${JSON.stringify(previous)}::jsonb
      AND provider_receipt_json->>'checks'=${String(previous.checks)}
      AND provider_receipt_json->>'portalId'=${previous.portalId}
      AND provider_receipt_json->>'formGuid'=${previous.formGuid}
      AND provider_receipt_json->>'markerProperty'=${previous.markerProperty}
      AND provider_receipt_json->>'markerValue'=${previous.markerValue}
    RETURNING attempt_id`.execute(db ?? await getDb())

  return result.rows.length === 1
}
