import 'server-only'

import { sql, type QueryExecutorProvider } from 'kysely'

import { hashIdentifier } from '../public-submission/abuse-guard'
import { parseHubSpotFormReceipt, isNativeHubspotSubmissionId } from './destinations/hubspot/receipts'
import { parseMetaReceiptObservation } from '../measurement/meta-receipt'

type TraceDb = QueryExecutorProvider
export type GrowthLeadTraceQuery = { kind: 'event' | 'submission'; id: string }
type Source = {
  submission_id: string; form_id?: string; form_version_id?: string; surface_id?: string | null
  status: string; created_at?: Date | string; delivery_attempts?: number
}
type Conversion = {
  event_id: string; source_kind: string; source_id: string; occurred_at?: Date | string
  consent_snapshot_json: Record<string, unknown>; policy_revision_id?: string | null
  encrypted_payload_present: boolean | null
}
type Delivery = {
  event_id: string; destination: string; state: string; attempts?: number; http_status?: number | null
  safe_error_class?: string | null; updated_at?: Date | string
  provider_receipts_json?: unknown
}
type Attempt = {
  attempt_id?: string; submission_id: string; destination_id?: string; provider: string
  adapter_version: string; status: string; http_status?: number | null; external_id?: string | null
  error_class?: string | null; retry_count?: number; created_at?: Date | string; completed_at?: Date | string | null
  provider_submission_id?: string | null; provider_receipt_json?: unknown
}
export type GrowthLeadTraceMetadata = {
  query: GrowthLeadTraceQuery; source: Source | null; conversion: Conversion | null
  deliveries: Delivery[]; hubspotAttempts: Attempt[]
}
export type PrivateHubspotTraceTarget = {
  destinationId: string; formGuid: string; portalId: string; privateEmail?: string
  fromMs: number; toMs: number; nativeSubmissionId?: string
  occurrenceMarker?: { name: string; value: string }
}
export type GrowthLeadTraceRead = {
  metadata: GrowthLeadTraceMetadata
  /** Non-enumerable: explicitly consumed in memory; JSON/spread must never carry email. */
  readonly privateHubspotTargets: PrivateHubspotTraceTarget[]
}

export class GrowthLeadTraceStoreError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'GrowthLeadTraceStoreError' }
}

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(v)

const normalizedEmail = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const value = v.trim().toLowerCase()

  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined
}

function time(value: unknown): number | null {
  const ms = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN

  return Number.isFinite(ms) ? ms : null
}

/** This closed snapshot deliberately omits any unexpected JSON fields/cookies/identifiers. */
function consentMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const safe: Record<string, unknown> = {}

  for (const key of ['advertisement', 'analytics', 'globalPrivacyControl']) {
    if (typeof record[key] === 'boolean') safe[key] = record[key]
  }

  for (const key of ['source', 'policyVersion']) {
    if (typeof record[key] === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(record[key])) safe[key] = record[key]
  }

  const captured = time(record.capturedAt)

  if (captured !== null) safe.capturedAt = new Date(captured).toISOString()

  return safe
}

function privateResult(metadata: GrowthLeadTraceMetadata, targets: PrivateHubspotTraceTarget[]): GrowthLeadTraceRead {
  const result = { metadata } as GrowthLeadTraceRead

  Object.defineProperty(result, 'privateHubspotTargets', { value: targets, enumerable: false, writable: false, configurable: false })

  return result
}

/** Caller owns the canonical runtime profile, READ ONLY transaction and timeout. No new pool. */
export async function readGrowthLeadTrace(db: TraceDb, query: GrowthLeadTraceQuery): Promise<GrowthLeadTraceRead> {
  if (!query || !['event', 'submission'].includes(query.kind) || !identifier(query.id) ||
    query.kind === 'event' && !UUID.test(query.id)) throw new GrowthLeadTraceStoreError('invalid_lead_trace_selector')
  let source: Source | null = null
  let conversion: Conversion | null = null

  if (query.kind === 'event') {
    const rows = await sql<Conversion>`SELECT event_id::text,source_kind,source_id,occurred_at,
      consent_snapshot_json,policy_revision_id,(encrypted_payload_json IS NOT NULL) AS encrypted_payload_present
      FROM greenhouse_growth.measurement_conversion WHERE event_id=${query.id}::uuid`.execute(db)

    conversion = rows.rows[0] ?? null
  }

  const sourceId = query.kind === 'submission' ? query.id : conversion?.source_kind === 'form_submission' ? conversion.source_id : null

  if (sourceId) {
    const rows = await sql<Source>`SELECT submission_id,form_id,form_version_id,surface_id,status,created_at,delivery_attempts
      FROM greenhouse_growth.form_submission WHERE submission_id=${sourceId}`.execute(db)

    source = rows.rows[0] ?? null
  }

  if (query.kind === 'submission' && source) {
    const rows = await sql<Conversion>`SELECT event_id::text,source_kind,source_id,occurred_at,
      consent_snapshot_json,policy_revision_id,(encrypted_payload_json IS NOT NULL) AS encrypted_payload_present
      FROM greenhouse_growth.measurement_conversion WHERE source_kind=${'form_submission'} AND source_id=${source.submission_id}`.execute(db)

    conversion = rows.rows[0] ?? null
  }

  if (conversion) conversion = { ...conversion, consent_snapshot_json: consentMetadata(conversion.consent_snapshot_json) }

  const deliveries = conversion ? (await sql<Delivery>`SELECT event_id::text,destination,state,attempts,http_status,safe_error_class,updated_at,
    to_jsonb(measurement_delivery)->${'provider_receipts_json'} AS provider_receipts_json
    FROM greenhouse_growth.measurement_delivery WHERE event_id=${conversion.event_id}::uuid ORDER BY destination`.execute(db)).rows.map(row => {
      const raw = row.provider_receipts_json
      const safe = Array.isArray(raw) && raw.length <= 5 ? raw.map(parseMetaReceiptObservation) : null

      return { ...row, provider_receipts_json: raw === undefined || raw === null ? undefined : safe?.every(Boolean) ? safe : {} }
    }) : []

  const rawAttempts = source ? (await sql<Attempt>`SELECT attempt_id,submission_id,destination_id,provider,adapter_version,status,
    http_status,external_id,error_class,retry_count,created_at,completed_at,
    to_jsonb(form_destination_attempt)->>${'provider_submission_id'} AS provider_submission_id,
    to_jsonb(form_destination_attempt)->${'provider_receipt_json'} AS provider_receipt_json FROM greenhouse_growth.form_destination_attempt
    WHERE submission_id=${source.submission_id} AND provider=${'hubspot'} ORDER BY created_at,attempt_id LIMIT 101`.execute(db)).rows : []

  if (rawAttempts.length > 100) throw new GrowthLeadTraceStoreError('lead_trace_attempt_limit_exceeded')

  const hubspotAttempts = rawAttempts.map(attempt => {
    const { provider_receipt_json: rawReceipt, provider_submission_id: rawNativeId, ...metadata } = attempt
    const receipt = parseHubSpotFormReceipt(rawReceipt)
    const bound = receipt?.markerValue === source?.submission_id && attempt.status === 'succeeded'

    return { ...metadata, ...(bound ? { provider_receipt_json: receipt } : {}),
      ...(bound && receipt?.status === 'verified' && receipt.paginationComplete === true && isNativeHubspotSubmissionId(rawNativeId)
        ? { provider_submission_id: rawNativeId } : {}) }
  })

  const metadata = { query: { kind: query.kind, id: query.id }, source, conversion, deliveries, hubspotAttempts }

  if (!source || !hubspotAttempts.length) return privateResult(metadata, [])
  type TargetRow = { destination_id: string; portal_id: string | null; form_guid: string | null; private_email: string | null }

  const targets = await sql<TargetRow>`SELECT d.destination_id,
    d.mapping_json->>${'portalId'} AS portal_id,d.mapping_json->>${'formGuid'} AS form_guid,
    (SELECT CASE WHEN COUNT(*)=1 THEN MAX(s.normalized_fields_json->>field.key) ELSE NULL END
      FROM jsonb_each_text(CASE WHEN jsonb_typeof(d.mapping_json->${'fieldMapping'})=${'object'}
        THEN d.mapping_json->${'fieldMapping'} ELSE '{}'::jsonb END) AS field
      WHERE field.value=${'email'}) AS private_email
    FROM greenhouse_growth.form_destination d
    JOIN greenhouse_growth.form_submission s ON s.form_version_id=d.form_version_id
    WHERE s.submission_id=${source.submission_id} AND d.provider=${'hubspot'}
      AND d.adapter_kind=${'hubspot_forms_secure_submit'}
      AND EXISTS (SELECT 1 FROM greenhouse_growth.form_destination_attempt a
        WHERE a.submission_id=s.submission_id AND a.destination_id=d.destination_id)`.execute(db)

  const privateTargets: PrivateHubspotTraceTarget[] = []

  for (const target of targets.rows) {
    const attempts = hubspotAttempts.filter(a => a.destination_id === target.destination_id)
    const starts = attempts.map(a => time(a.created_at)).filter((v): v is number => v !== null)
    const ends = attempts.map(a => time(a.completed_at ?? a.created_at)).filter((v): v is number => v !== null)

    if (!starts.length || !ends.length) continue
    const email = normalizedEmail(target.private_email)

    const tracked = [...attempts].reverse().find(a => {
      const r = parseHubSpotFormReceipt(a.provider_receipt_json)

      return a.status === 'succeeded' && r?.markerValue === source.submission_id
    })

    const receipt = parseHubSpotFormReceipt(tracked?.provider_receipt_json)

    const nativeId = receipt?.status === 'verified' && receipt.paginationComplete === true && isNativeHubspotSubmissionId(tracked?.provider_submission_id)
      ? tracked.provider_submission_id : undefined

    const portalId = receipt?.portalId ?? target.portal_id
    const formGuid = receipt?.formGuid ?? target.form_guid

    if (!portalId || !/^\d+$/.test(portalId) || !formGuid || !UUID.test(formGuid)) continue

    privateTargets.push({ destinationId: target.destination_id, formGuid, portalId,
      ...(receipt ? { occurrenceMarker: { name: receipt.markerProperty, value: receipt.markerValue } } : {}),
      ...(nativeId ? { nativeSubmissionId: nativeId } : {}),
      ...(email ? { privateEmail: email } : {}), fromMs: Math.min(...starts) - 30_000, toMs: Math.max(...ends) + 30_000 })
  }

  return privateResult(metadata, privateTargets)
}

/** Private email is a selector only: neither it nor its derived hash crosses this metadata result. */
export async function findGrowthLeadTraceCandidates(db: TraceDb, input: {
  privateEmail: string; from: Date | string; to: Date | string; limit?: number
}) {
  const email = normalizedEmail(input.privateEmail)
  const from = time(input.from), to = time(input.to), limit = input.limit ?? 20

  if (!email || from === null || to === null || from > to || !Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new GrowthLeadTraceStoreError('invalid_lead_trace_find')
  const hash = hashIdentifier(email, 'gh-forms-email-v1')

  const found = await sql<Source>`SELECT s.submission_id,s.form_id,s.form_version_id,s.surface_id,s.status,s.created_at,s.delivery_attempts
    FROM greenhouse_growth.form_submission s
    JOIN greenhouse_growth.form_version v ON v.form_version_id=s.form_version_id
    WHERE s.created_at>=${new Date(from)} AND s.created_at<=${new Date(to)} AND
      (s.lead_email_hash=${hash} OR (s.lead_email_hash IS NULL AND
        (SELECT COUNT(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v.field_schema_json)=${'array'}
          THEN v.field_schema_json ELSE '[]'::jsonb END) AS field WHERE field->>${'type'}=${'email'})=1 AND
        EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v.field_schema_json)=${'array'}
          THEN v.field_schema_json ELSE '[]'::jsonb END) AS field
          WHERE field->>${'type'}=${'email'} AND lower(btrim(s.normalized_fields_json->>(field->>${'key'})))=${email})))
    ORDER BY s.created_at DESC,s.submission_id LIMIT ${limit + 1}`.execute(db)

  return { candidates: found.rows.slice(0, limit), hasMore: found.rows.length > limit }
}
