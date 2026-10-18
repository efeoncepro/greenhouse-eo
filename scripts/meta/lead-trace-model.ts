/** Pure classification of metadata already read by the CLI. No I/O, payload decryption, or provider calls. */
import { parseHubSpotFormReceipt, isNativeHubspotSubmissionId } from '../../src/lib/growth/forms/destinations/hubspot/receipts'
import { summarizeMetaReceipts } from '../../src/lib/growth/measurement/meta-receipt'

export type RemoteLeadTraceStatus = 'not_checked' | 'confirmed' | 'correlated' | 'not_found' | 'partial' | 'ambiguous' | 'unavailable' | 'not_applicable'
export type LeadTraceDate = Date | string | null

export interface LeadSourceMetadata {
  submission_id: string
  form_id?: string | null
  form_version_id?: string | null
  surface_id?: string | null
  status: string
  created_at?: LeadTraceDate
  delivery_attempts?: number | null
}

export interface LeadConversionMetadata {
  event_id: string
  source_kind: string
  source_id: string
  occurred_at?: LeadTraceDate
  consent_snapshot_json: unknown
  policy_revision_id?: string | null
  encrypted_payload_present?: boolean | null
  has_encrypted_payload?: boolean | null
}

export interface LeadDeliveryMetadata {
  event_id: string
  destination: string
  state: string
  attempts?: number | null
  http_status?: number | null
  safe_error_class?: string | null
  updated_at?: LeadTraceDate
  provider_receipts_json?: unknown
}

export interface LeadHubspotAttemptMetadata {
  attempt_id?: string
  submission_id: string
  destination_id?: string
  provider: string
  adapter_version: string
  status: string
  http_status?: number | null
  external_id?: string | null
  error_class?: string | null
  retry_count?: number | null
  created_at?: LeadTraceDate
  provider_submission_id?: string | null
  provider_receipt_json?: unknown
}

export interface RemoteStageEvidence {
  status: RemoteLeadTraceStatus
  matchedSubmissionId?: string
  nativeSubmissionId?: string
  correlation?: 'exact_uuid' | 'time_email_fields' | 'identity' | 'none'
  safeErrorCode?: string
}

export interface LeadTraceInput {
  query: { kind: 'event' | 'submission'; id: string }
  source: LeadSourceMetadata | null
  conversion: LeadConversionMetadata | null
  deliveries: readonly LeadDeliveryMetadata[]
  hubspotAttempts: readonly LeadHubspotAttemptMetadata[]
  remoteHubspot?: { formSubmission: RemoteStageEvidence; contact: RemoteStageEvidence }
}

export interface LeadTraceReport {
  contract: 'meta-lead-trace.v1'
  query: LeadTraceInput['query']
  source: {
    status: 'recorded' | 'not_found' | 'unsupported_source' | 'correlation_mismatch'
    sourceKind: 'form_submission' | 'meeting_booking' | 'unknown' | 'unsupported'
    submissionId?: string
    formId?: string
    formVersionId?: string
    surfaceId?: string
    lifecycle?: string
    commercialAcceptance: 'recorded' | 'rejected' | 'unknown'
    recordedAt?: string
  }
  consent: {
    status: 'granted' | 'denied' | 'gpc_denied' | 'invalid_snapshot' | 'unknown'
    advertisement: boolean | null
    analytics: boolean | null
    globalPrivacyControl: boolean | null
    capturedAt?: string
    policyRevisionId?: string
  }
  measurement: {
    status: 'recorded' | 'not_recorded' | 'correlation_mismatch'
    eventId?: string
    occurredAt?: string
    policyRevisionId?: string
    projection: {
      encryptedPayload: 'present' | 'absent' | 'unknown'
      metaProjection: 'not_inspected'
      reasonCode: 'encrypted_payload_not_decrypted'
    }
  }
  meta: {
    receipt: ReturnType<typeof summarizeMetaReceipts>
    delivery: {
      status: 'ack_recorded' | 'queued' | 'sending' | 'dead_letter' | 'not_recorded' | 'inconsistent'
      attempts?: number
      httpStatus?: number
      safeErrorClass?: string
      updatedAt?: string
      ackEvidence?: 'measurement_delivery_http_accepted_state'
    }
    processing: {
      status: 'unknown'
      matching: 'unknown'
      deduplication: 'unknown'
      attribution: 'unknown'
      reasonCode: 'provider_event_processing_not_observed'
    }
  }
  hubspot: {
    localAttempt: {
      status: 'succeeded_recorded' | 'retrying' | 'dead_letter' | 'failed' | 'ambiguous' | 'not_recorded' | 'fake_only' | 'not_applicable'
      attemptCount: number
      destinationCount: number
      ignoredFakeAttempts: number
      attempts: {
        attemptId?: string
        destinationId?: string
        status: string
        httpStatus?: number
        safeErrorClass?: string
        externalIdKind: 'local_hsforms_receipt' | 'fake' | 'unverified_identifier' | 'absent'
        nativeSubmissionId?: string
        receiptStatus?: string
        receiptCheckCount?: number
        createdAt?: string
      }[]
    }
    remoteForm: RemoteStageEvidence
    remoteContact: RemoteStageEvidence
    contactCreatedByThisSubmission: 'unknown'
  }
  issueCodes: string[]
  limitations: readonly string[]
}

export class LeadTraceModelError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.name = 'LeadTraceModelError'
    this.code = code
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SOURCE_STATES = new Set(['received', 'validated', 'accepted', 'routed', 'delivered', 'destination_failed', 'retrying', 'dead_letter', 'rejected'])
const ACCEPTED_SOURCE_STATES = new Set(['accepted', 'routed', 'delivered', 'destination_failed', 'retrying', 'dead_letter'])
const ATTEMPT_STATES = new Set(['succeeded', 'retrying', 'dead_letter', 'failed', 'skipped'])
const REMOTE_STATES = new Set<RemoteLeadTraceStatus>(['not_checked', 'confirmed', 'correlated', 'not_found', 'partial', 'ambiguous', 'unavailable', 'not_applicable'])

const ERROR_CLASSES = new Set(['meta_ack_invalid', 'transport_or_ack_failed', 'measurement_policy_unavailable',
  'measurement_policy_revoked', 'measurement_payload_invalid', 'retry_window_expired', 'validation_error', 'auth_error',
  'form_not_found', 'rate_limited', 'hubspot_server_error', 'hubspot_unexpected', 'timeout', 'network_error',
  'mapping_incomplete', 'empty_field_mapping', 'token_unavailable', 'adapter_not_supported', 'hubspot_adapter_disabled',
  'scope_denied', 'invalid_response', 'ambiguous_match', 'provider_unavailable', 'query_not_supported', 'hubspot_api_error'])

const uuid = (value: unknown): string | undefined => typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : undefined
const formSubmissionId = (value: unknown): string | undefined => typeof value === 'string' && value.startsWith('fsub-') && UUID.test(value.slice(5)) ? value.toLowerCase() : undefined
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown): number | undefined => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
const http = (value: unknown): number | undefined => typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined

const iso = (value: unknown): string | undefined => {
  if (!(value instanceof Date) && typeof value !== 'string') return undefined
  const date = value instanceof Date ? value : new Date(value)


return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

const operationalId = (value: unknown): string | undefined => typeof value === 'string' &&
  /^[A-Za-z0-9_-]{1,160}$/.test(value) && !/^EAA[A-Za-z0-9]{30}/.test(value) ? value : undefined

const safeError = (value: unknown): string | undefined => typeof value === 'string' && value ?
  ERROR_CLASSES.has(value) || /^(provider_)?http_[1-5][0-9]{2}$/.test(value) ? value : 'unrecognized_error_class' : undefined

const LIMITATIONS = Object.freeze([
  'A missing conversion does not establish consent denial or its omission reason; capture, policy, identity, and enqueue failures can also omit it.',
  'Encrypted payload presence does not establish a valid Meta projection; matching material is never decrypted by this model.',
  'http_accepted records the dispatcher ACK contract (HTTP success and sGTM Meta tag success), not Meta processing, matching, deduplication, or attribution.',
  'The dispatcher summary field processed counts attempted local jobs, not events processed by Meta.',
  'A HubSpot succeeded attempt records local HTTP acceptance. hsforms-<submission UUID> is generated locally and is not a provider submission ID.',
  'A native HubSpot form match by time, email and fields is correlation; a contact found by identity does not prove this form submission or a newly created contact.'
])

/** Models trace evidence without copying PII, hashes, raw payloads, cookies, URLs or provider messages. */
export function buildLeadTrace(input: LeadTraceInput): LeadTraceReport {
  const queryId = input.query.kind === 'submission' ? formSubmissionId(input.query.id) : uuid(input.query.id)

  if (!queryId || !['event', 'submission'].includes(input.query.kind)) throw new LeadTraceModelError('invalid_trace_uuid')
  const issues = new Set<string>()
  const rawConversion = input.conversion

  const conversionMatches = rawConversion !== null && Boolean(uuid(rawConversion.event_id)) &&
    (input.query.kind === 'event' ? uuid(rawConversion.event_id) === queryId :
      rawConversion.source_kind === 'form_submission' && formSubmissionId(rawConversion.source_id) === queryId)

  const conversion = conversionMatches ? rawConversion : null

  if (rawConversion && !conversionMatches) issues.add('CONVERSION_CORRELATION_MISMATCH')

  const kind = conversion?.source_kind === 'form_submission' ? 'form_submission' : conversion?.source_kind === 'meeting_booking' ? 'meeting_booking' :
    conversion ? 'unsupported' : input.query.kind === 'submission' ? 'form_submission' : 'unknown'

  const supported = kind === 'form_submission' || kind === 'unknown'
  const submissionId = input.query.kind === 'submission' ? queryId : kind === 'form_submission' ? formSubmissionId(conversion?.source_id) : undefined
  const sourceMatches = Boolean(submissionId && input.source && formSubmissionId(input.source.submission_id) === submissionId)

  if (input.source && supported && !sourceMatches) issues.add('SOURCE_CORRELATION_MISMATCH')
  const sourceRow = sourceMatches ? input.source : null
  const lifecycle = sourceRow && SOURCE_STATES.has(sourceRow.status) ? sourceRow.status : undefined

  const source: LeadTraceReport['source'] = {
    status: !supported ? 'unsupported_source' : input.source && !sourceMatches ? 'correlation_mismatch' : sourceRow ? 'recorded' : 'not_found',
    sourceKind: kind,
    ...(submissionId ? { submissionId } : {}),
    ...(sourceRow && operationalId(sourceRow.form_id) ? { formId: operationalId(sourceRow.form_id) } : {}),
    ...(sourceRow && operationalId(sourceRow.form_version_id) ? { formVersionId: operationalId(sourceRow.form_version_id) } : {}),
    ...(sourceRow && operationalId(sourceRow.surface_id) ? { surfaceId: operationalId(sourceRow.surface_id) } : {}),
    ...(lifecycle ? { lifecycle } : {}),
    commercialAcceptance: lifecycle === 'rejected' ? 'rejected' : lifecycle && ACCEPTED_SOURCE_STATES.has(lifecycle) ? 'recorded' : 'unknown',
    ...(sourceRow && iso(sourceRow.created_at) ? { recordedAt: iso(sourceRow.created_at) } : {})
  }

  const snapshot = conversion && object(conversion.consent_snapshot_json) ? conversion.consent_snapshot_json : null
  const boolean = (value: unknown): boolean | null => typeof value === 'boolean' ? value : null
  const advertisement = boolean(snapshot?.advertisement)
  const analytics = boolean(snapshot?.analytics)
  const globalPrivacyControl = boolean(snapshot?.globalPrivacyControl)
  const policyRevisionId = uuid(conversion?.policy_revision_id)

  const consent: LeadTraceReport['consent'] = {
    status: !conversion ? 'unknown' : !snapshot || advertisement === null || analytics === null || globalPrivacyControl === null ? 'invalid_snapshot' :
      globalPrivacyControl ? 'gpc_denied' : advertisement ? 'granted' : 'denied',
    advertisement, analytics, globalPrivacyControl,
    ...(iso(snapshot?.capturedAt) ? { capturedAt: iso(snapshot?.capturedAt) } : {}),
    ...(policyRevisionId ? { policyRevisionId } : {})
  }

  const eventId = uuid(conversion?.event_id)
  const metaRows = input.deliveries.filter(row => row.destination === 'meta' && eventId && uuid(row.event_id) === eventId)

  if (input.deliveries.some(row => row.destination === 'meta' && (!eventId || uuid(row.event_id) !== eventId))) issues.add('DELIVERY_CORRELATION_MISMATCH')
  if (metaRows.length > 1) issues.add('MULTIPLE_META_DELIVERY_ROWS')
  const deliveryRow = metaRows.length === 1 ? metaRows[0] : undefined
  const delivery: LeadTraceReport['meta']['delivery'] = { status: metaRows.length > 1 ? 'inconsistent' : 'not_recorded' }

  if (deliveryRow) {
    const status = http(deliveryRow.http_status)

    if (deliveryRow.state === 'http_accepted') {
      delivery.status = status !== undefined && status >= 200 && status < 300 && !deliveryRow.safe_error_class ? 'ack_recorded' : 'inconsistent'
      if (delivery.status === 'ack_recorded') delivery.ackEvidence = 'measurement_delivery_http_accepted_state'
      else issues.add('META_ACK_STATE_INCONSISTENT')
    } else if (['queued', 'sending', 'dead_letter'].includes(deliveryRow.state)) delivery.status = deliveryRow.state as 'queued' | 'sending' | 'dead_letter'
    else { delivery.status = 'inconsistent'; issues.add('UNKNOWN_META_DELIVERY_STATE') }

    const attempts = count(deliveryRow.attempts), error = safeError(deliveryRow.safe_error_class), updatedAt = iso(deliveryRow.updated_at)

    if (attempts !== undefined) delivery.attempts = attempts
    if (status !== undefined) delivery.httpStatus = status
    if (error) delivery.safeErrorClass = error
    if (updatedAt) delivery.updatedAt = updatedAt
    if (consent.status === 'denied' || consent.status === 'gpc_denied') issues.add('META_DELIVERY_WITH_DENIED_CONSENT_SNAPSHOT')
  }

  const matchingAttempts = supported && submissionId ? input.hubspotAttempts.filter(row =>
    row.provider === 'hubspot' && formSubmissionId(row.submission_id) === submissionId) : []

  // Canonical fake discriminator: forms/store.ts FAKE_ADAPTER_VERSION. Never suppress a real adapter by an ID pattern.
  const fakeAttempts = matchingAttempts.filter(row => row.adapter_version === 'fake-v1')
  const realAttempts = matchingAttempts.filter(row => !fakeAttempts.includes(row))
  const latest = new Map<string, LeadHubspotAttemptMetadata>()

  for (const row of [...realAttempts].sort((a, b) => (iso(a.created_at) ?? '').localeCompare(iso(b.created_at) ?? ''))) latest.set(row.destination_id ?? 'unknown', row)
  const latestRows = [...latest.values()]
  const destinationMissing = realAttempts.some(row => !row.destination_id)

  const successWithoutAck = latestRows.some(row => row.status === 'succeeded' &&
    ((http(row.http_status) ?? 0) < 200 || (http(row.http_status) ?? 600) >= 300 || Boolean(row.error_class)))

  if (destinationMissing) issues.add('HUBSPOT_DESTINATION_CORRELATION_MISSING')
  if (successWithoutAck) issues.add('HUBSPOT_SUCCESS_WITHOUT_HTTP_ACK')

  const localStatus: LeadTraceReport['hubspot']['localAttempt']['status'] = !supported ? 'not_applicable' : !realAttempts.length ? fakeAttempts.length ? 'fake_only' : 'not_recorded' :
    destinationMissing || successWithoutAck ? 'ambiguous' :
    latestRows.every(row => row.status === 'succeeded' && (http(row.http_status) ?? 0) >= 200 && (http(row.http_status) ?? 600) < 300) ? 'succeeded_recorded' :
      latestRows.some(row => row.status === 'dead_letter') ? 'dead_letter' : latestRows.some(row => row.status === 'retrying') ? 'retrying' : 'failed'

  const localAttempt: LeadTraceReport['hubspot']['localAttempt'] = {
    status: localStatus, attemptCount: realAttempts.length, destinationCount: latest.size, ignoredFakeAttempts: fakeAttempts.length,
    attempts: realAttempts.map(row => {
      const receipt = parseHubSpotFormReceipt(row.provider_receipt_json)
      const bound = receipt?.markerValue === submissionId && row.status === 'succeeded'

      return {
      ...(operationalId(row.attempt_id) ? { attemptId: operationalId(row.attempt_id) } : {}),
      ...(operationalId(row.destination_id) ? { destinationId: operationalId(row.destination_id) } : {}),
      status: ATTEMPT_STATES.has(row.status) ? row.status : 'unknown',
      ...(http(row.http_status) !== undefined ? { httpStatus: http(row.http_status) } : {}),
      ...(safeError(row.error_class) ? { safeErrorClass: safeError(row.error_class) } : {}),
      externalIdKind: !row.external_id ? 'absent' : row.external_id === 'hsforms-' + submissionId ? 'local_hsforms_receipt' : row.external_id.startsWith('fake-') ? 'fake' : 'unverified_identifier',
      ...(bound && receipt ? { receiptStatus: receipt.status, receiptCheckCount: receipt.checks } : {}),
      ...(bound && receipt?.status === 'verified' && receipt.paginationComplete && isNativeHubspotSubmissionId(row.provider_submission_id) ? { nativeSubmissionId: row.provider_submission_id } : {}),
      ...(iso(row.created_at) ? { createdAt: iso(row.created_at) } : {})
    } })
  }

  const remote = (stage: 'formSubmission' | 'contact'): RemoteStageEvidence => {
    if (!supported) return { status: 'not_applicable' }
    const evidence = input.remoteHubspot?.[stage]

    if (!evidence) return { status: 'not_checked' }
    const result: RemoteStageEvidence = { status: REMOTE_STATES.has(evidence.status) ? evidence.status : 'unavailable' }
    const correlation = ['exact_uuid', 'time_email_fields', 'identity', 'none'].includes(evidence.correlation ?? '') ? evidence.correlation : undefined

    if (correlation) result.correlation = correlation
    if (typeof evidence.nativeSubmissionId === 'string' && /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[0-9]{1,40})$/i.test(evidence.nativeSubmissionId))
      result.nativeSubmissionId = evidence.nativeSubmissionId

    if (stage === 'formSubmission' && result.status === 'confirmed') {
      if (correlation !== 'exact_uuid' || !submissionId || formSubmissionId(evidence.matchedSubmissionId) !== submissionId) {
        result.status = correlation === 'time_email_fields' ? 'correlated' : 'ambiguous'
        issues.add('HUBSPOT_FORM_STRONG_CORRELATION_MISSING')
      } else result.matchedSubmissionId = submissionId
    }

    if (stage === 'formSubmission' && evidence.matchedSubmissionId && formSubmissionId(evidence.matchedSubmissionId) !== submissionId &&
        (result.status === 'confirmed' || result.status === 'correlated')) {
      result.status = 'ambiguous'; issues.add('HUBSPOT_FORM_CORRELATION_MISMATCH')
    }

    if (stage === 'contact' && result.status === 'confirmed' && correlation !== 'identity' && correlation !== 'exact_uuid') {
      result.status = 'ambiguous'; issues.add('HUBSPOT_CONTACT_IDENTITY_CORRELATION_MISSING')
    }

    if (safeError(evidence.safeErrorCode)) result.safeErrorCode = safeError(evidence.safeErrorCode)

return result
  }

  const encrypted = conversion?.encrypted_payload_present ?? conversion?.has_encrypted_payload


return {
    contract: 'meta-lead-trace.v1', query: { kind: input.query.kind, id: queryId }, source, consent,
    measurement: {
      status: rawConversion && !conversionMatches ? 'correlation_mismatch' : conversion ? 'recorded' : 'not_recorded',
      ...(eventId ? { eventId } : {}), ...(iso(conversion?.occurred_at) ? { occurredAt: iso(conversion?.occurred_at) } : {}),
      ...(policyRevisionId ? { policyRevisionId } : {}),
      projection: { encryptedPayload: encrypted === true ? 'present' : encrypted === false ? 'absent' : 'unknown',
        metaProjection: 'not_inspected', reasonCode: 'encrypted_payload_not_decrypted' }
    },
    meta: { delivery, receipt: summarizeMetaReceipts(deliveryRow?.provider_receipts_json, eventId,
      iso(conversion?.occurred_at) ? Math.floor(Date.parse(iso(conversion?.occurred_at)!) / 1000) : undefined, count(deliveryRow?.attempts)),
      processing: { status: 'unknown', matching: 'unknown', deduplication: 'unknown', attribution: 'unknown', reasonCode: 'provider_event_processing_not_observed' } },
    hubspot: { localAttempt, remoteForm: remote('formSubmission'), remoteContact: remote('contact'), contactCreatedByThisSubmission: 'unknown' },
    issueCodes: [...issues], limitations: LIMITATIONS
  }
}
