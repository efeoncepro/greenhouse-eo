import { describe, expect, it } from 'vitest'

import { buildLeadTrace, LeadTraceModelError, type LeadTraceInput, type LeadHubspotAttemptMetadata } from './lead-trace-model'

const EVENT = 'a1111111-1111-4111-8111-111111111111'
const SUBMISSION = 'fsub-b2222222-2222-4222-8222-222222222222'
const OTHER = 'c3333333-3333-4333-8333-333333333333'
const DESTINATION = 'd4444444-4444-4444-8444-444444444444'
const POLICY = 'e5555555-5555-4555-8555-555555555555'
const now = '2026-10-17T20:00:00.000Z'

function input(): LeadTraceInput {
  return { query: { kind: 'submission', id: SUBMISSION },
    source: { submission_id: SUBMISSION, status: 'accepted', form_id: OTHER, form_version_id: 'fver-real-version', surface_id: 'public-site', created_at: now },
    conversion: { event_id: EVENT, source_kind: 'form_submission', source_id: SUBMISSION, occurred_at: now,
      consent_snapshot_json: { advertisement: true, analytics: true, globalPrivacyControl: false, capturedAt: now },
      policy_revision_id: POLICY, encrypted_payload_present: true },
    deliveries: [], hubspotAttempts: [] }
}

function attempt(overrides: Partial<LeadHubspotAttemptMetadata> = {}): LeadHubspotAttemptMetadata {
  return { attempt_id: OTHER, submission_id: SUBMISSION, destination_id: DESTINATION, provider: 'hubspot',
    adapter_version: 'hubspot-forms-v1', status: 'succeeded', http_status: 200,
    external_id: 'hsforms-' + SUBMISSION, created_at: now, ...overrides }
}

describe('pure lead trace evidence model', () => {
  it.each([['received', 'unknown'], ['validated', 'unknown'], ['destination_failed', 'recorded']] as const)
  ('does not confuse source lifecycle %s with commercial acceptance', (status, acceptance) => {
    const data = input()

    data.source!.status = status
    expect(buildLeadTrace(data).source).toMatchObject({ lifecycle: status, commercialAcceptance: acceptance })
  })
  it('separates local commercial acceptance, recorded tag ACK, Meta processing, and HubSpot remote evidence', () => {
    const data = input()

    data.deliveries = [{ event_id: EVENT, destination: 'meta', state: 'http_accepted', http_status: 200, attempts: 1 }]
    data.hubspotAttempts = [attempt()]
    const report = buildLeadTrace(data)

    expect(report.source).toMatchObject({ status: 'recorded', commercialAcceptance: 'recorded' })
    expect(report.meta.delivery).toMatchObject({ status: 'ack_recorded', ackEvidence: 'measurement_delivery_http_accepted_state' })
    expect(report.meta.processing).toEqual({ status: 'unknown', matching: 'unknown', deduplication: 'unknown', attribution: 'unknown', reasonCode: 'provider_event_processing_not_observed' })
    expect(report.hubspot.localAttempt).toMatchObject({ status: 'succeeded_recorded', attemptCount: 1 })
    expect(report.hubspot.localAttempt.attempts[0].externalIdKind).toBe('local_hsforms_receipt')
    expect(report.hubspot.remoteForm.status).toBe('not_checked')
    expect(report.hubspot.remoteContact.status).toBe('not_checked')
    expect(report.hubspot.contactCreatedByThisSubmission).toBe('unknown')
  })

  it('does not infer consent denial from an omitted conversion or HubSpot delivery from source.delivered', () => {
    const data = input()

    data.conversion = null
    data.source!.status = 'delivered'
    const report = buildLeadTrace(data)

    expect(report.consent).toMatchObject({ status: 'unknown', advertisement: null })
    expect(report.measurement.status).toBe('not_recorded')
    expect(report.hubspot.localAttempt.status).toBe('not_recorded')
    expect(report.source.commercialAcceptance).toBe('recorded')
  })

  it('models consent values independently and identifies contradictory delivery metadata', () => {
    for (const [advertisement, globalPrivacyControl, status] of [[false, false, 'denied'], [true, true, 'gpc_denied']] as const) {
      const data = input()

      data.conversion!.consent_snapshot_json = { advertisement, globalPrivacyControl, analytics: true }
      data.deliveries = [{ event_id: EVENT, destination: 'meta', state: 'queued' }]
      expect(buildLeadTrace(data)).toMatchObject({ consent: { status }, issueCodes: ['META_DELIVERY_WITH_DENIED_CONSENT_SNAPSHOT'] })
    }

    const malformed = input()

    malformed.conversion!.consent_snapshot_json = { advertisement: 'yes' }
    expect(buildLeadTrace(malformed).consent.status).toBe('invalid_snapshot')
  })

  it('shows queued, sending, failed and inconsistent states without promoting them to processing', () => {
    for (const state of ['queued', 'sending', 'dead_letter']) {
      const data = input()

      data.deliveries = [{ event_id: EVENT, destination: 'meta', state, attempts: 2, safe_error_class: 'transport_or_ack_failed' }]
      expect(buildLeadTrace(data).meta.delivery.status).toBe(state)
      expect(buildLeadTrace(data).meta.processing.status).toBe('unknown')
    }

    const invalidAck = input()

    invalidAck.deliveries = [{ event_id: EVENT, destination: 'meta', state: 'http_accepted', http_status: 502 }]
    expect(buildLeadTrace(invalidAck).meta.delivery.status).toBe('inconsistent')
  })

  it('does not inspect an encrypted payload or expose arbitrary fields, matching hashes, cookies or raw errors', () => {
    const data = input()

    Object.assign(data.source!, { normalized_fields_json: { email: 'private@example.test' }, page_uri: 'https://example.test/?token=PRIVATE_TOKEN' })
    Object.assign(data.conversion!, { encrypted_payload_json: { ciphertext: 'PRIVATE_CIPHERTEXT' } })
    Object.assign(data.conversion!.consent_snapshot_json as object, { fbp: 'PRIVATE_COOKIE', em: 'PRIVATE_HASH' })
    data.deliveries = [{ event_id: EVENT, destination: 'meta', state: 'queued', safe_error_class: 'private@example.test' }]
    const report = buildLeadTrace(data)

    expect(report.measurement.projection).toEqual({ encryptedPayload: 'present', metaProjection: 'not_inspected', reasonCode: 'encrypted_payload_not_decrypted' })
    const encoded = JSON.stringify(report)

    for (const forbidden of ['private@example.test', 'PRIVATE_TOKEN', 'PRIVATE_CIPHERTEXT', 'PRIVATE_COOKIE', 'PRIVATE_HASH']) expect(encoded).not.toContain(forbidden)
    expect(report.meta.delivery.safeErrorClass).toBe('unrecognized_error_class')
    data.conversion!.encrypted_payload_present = false
    expect(buildLeadTrace(data).measurement.projection.encryptedPayload).toBe('absent')
  })

  it('enforces UUID correlation rather than mixing evidence from different leads', () => {
    const data = input()

    data.conversion!.source_id = 'fsub-' + OTHER
    data.deliveries = [{ event_id: EVENT, destination: 'meta', state: 'http_accepted', http_status: 200 }]
    data.hubspotAttempts = [attempt({ submission_id: 'fsub-' + OTHER })]
    const report = buildLeadTrace(data)

    expect(report.measurement.status).toBe('correlation_mismatch')
    expect(report.consent.status).toBe('unknown')
    expect(report.meta.delivery.status).toBe('not_recorded')
    expect(report.hubspot.localAttempt.status).toBe('not_recorded')
    expect(report.issueCodes).toContain('CONVERSION_CORRELATION_MISMATCH')
  })

  it('reports unsupported non-form sources honestly while retaining their measurement evidence', () => {
    const data = input()

    data.query = { kind: 'event', id: EVENT }
    data.source = null
    data.conversion!.source_kind = 'meeting_booking'
    data.deliveries = [{ event_id: EVENT, destination: 'meta', state: 'http_accepted', http_status: 200 }]
    const report = buildLeadTrace(data)

    expect(report.source).toMatchObject({ status: 'unsupported_source', sourceKind: 'meeting_booking' })
    expect(report.measurement.status).toBe('recorded')
    expect(report.meta.delivery.status).toBe('ack_recorded')
    expect(report.hubspot.localAttempt.status).toBe('not_applicable')
    expect(report.hubspot.remoteForm.status).toBe('not_applicable')
  })

  it('excludes the canonical fake adapter but never discards real failures by an external-ID pattern', () => {
    const data = input()

    data.hubspotAttempts = [attempt({ adapter_version: 'fake-v1' })]
    expect(buildLeadTrace(data).hubspot.localAttempt).toMatchObject({ status: 'fake_only', attemptCount: 0, ignoredFakeAttempts: 1 })
    data.hubspotAttempts = [attempt({ status: 'dead_letter', http_status: 403, external_id: 'fake-untrusted-marker' })]
    expect(buildLeadTrace(data).hubspot.localAttempt.status).toBe('dead_letter')
    data.hubspotAttempts = [attempt({ status: 'dead_letter', http_status: 403, created_at: '2026-10-17T19:00:00Z' }), attempt()]
    expect(buildLeadTrace(data).hubspot.localAttempt).toMatchObject({ status: 'succeeded_recorded', attemptCount: 2, destinationCount: 1 })
  })

  it('requires an exact source UUID for a confirmed native HubSpot form submission', () => {
    const data = input()

    data.remoteHubspot = { formSubmission: { status: 'confirmed', correlation: 'time_email_fields' }, contact: { status: 'confirmed', correlation: 'identity' } }
    const correlated = buildLeadTrace(data)

    expect(correlated.hubspot.remoteForm.status).toBe('correlated')
    expect(correlated.hubspot.remoteContact.status).toBe('confirmed')
    expect(correlated.hubspot.contactCreatedByThisSubmission).toBe('unknown')
    data.remoteHubspot.formSubmission = { status: 'confirmed', correlation: 'exact_uuid', matchedSubmissionId: SUBMISSION }
    expect(buildLeadTrace(data).hubspot.remoteForm).toMatchObject({ status: 'confirmed', matchedSubmissionId: SUBMISSION })
    data.remoteHubspot.formSubmission.matchedSubmissionId = OTHER
    expect(buildLeadTrace(data).hubspot.remoteForm.status).toBe('ambiguous')
  })

  it('keeps partial, ambiguous, not_found and unavailable remote stages distinct from local success', () => {
    for (const status of ['partial', 'ambiguous', 'not_found', 'unavailable'] as const) {
      const data = input()

      data.hubspotAttempts = [attempt()]
      data.remoteHubspot = { formSubmission: { status }, contact: { status: 'not_checked' } }
      expect(buildLeadTrace(data).hubspot.remoteForm.status).toBe(status)
      expect(buildLeadTrace(data).hubspot.localAttempt.status).toBe('succeeded_recorded')
    }
  })

  it('rejects unsafe query IDs without returning their contents and leaves input metadata unchanged', () => {
    const data = input()
    const before = JSON.stringify(data)

    buildLeadTrace(data)
    expect(JSON.stringify(data)).toBe(before)
    data.query.id = 'private@example.test'
    expect(() => buildLeadTrace(data)).toThrow(LeadTraceModelError)
    expect(() => buildLeadTrace(data)).toThrow('invalid_trace_uuid')
    data.query.id = SUBMISSION.slice(5)
    expect(() => buildLeadTrace(data)).toThrow('invalid_trace_uuid')
  })
  it('exposes a native receipt ID only after complete verification bound to this occurrence', () => {
    const receipt = { contract: 'hubspot-form-receipt.v1', status: 'verified', portalId: '48713323', formGuid: DESTINATION,
      markerProperty: 'ef_greenhouse_submission_id', markerValue: SUBMISSION, checks: 1, nextCheckAt: now, checkedAt: now, paginationComplete: true,
      rawEmail: 'private@example.test', response: { token: 'PRIVATE_TOKEN' } }

    const data = input()

    data.hubspotAttempts = [attempt({ provider_submission_id: OTHER, provider_receipt_json: receipt })]
    const report = buildLeadTrace(data)

    expect(report.hubspot.localAttempt.attempts[0]).toMatchObject({ receiptStatus: 'verified', receiptCheckCount: 1, nativeSubmissionId: OTHER })
    expect(report.hubspot.remoteForm.status).toBe('not_checked')
    expect(JSON.stringify(report)).not.toMatch(/private@example|PRIVATE_TOKEN|provider_receipt_json|markerValue/)

    for (const changed of [{ status: 'pending' }, { paginationComplete: false }, { markerValue: 'fsub-' + OTHER }, { portalId: '19893546' }, { markerProperty: 'email' }]) {
      data.hubspotAttempts = [attempt({ provider_submission_id: OTHER, provider_receipt_json: { ...receipt, ...changed } })]
      expect(buildLeadTrace(data).hubspot.localAttempt.attempts[0]).not.toHaveProperty('nativeSubmissionId')
    }

    data.hubspotAttempts = [attempt({ status: 'failed', provider_submission_id: OTHER, provider_receipt_json: receipt })]
    expect(buildLeadTrace(data).hubspot.localAttempt.attempts[0]).not.toHaveProperty('nativeSubmissionId')
  })

  it('retains exact source occurrence and distinct native conversion IDs without conflating their namespaces', () => {
    const data = input()

    data.remoteHubspot = { formSubmission: { status: 'confirmed', correlation: 'exact_uuid', matchedSubmissionId: SUBMISSION, nativeSubmissionId: OTHER }, contact: { status: 'not_checked' } }
    expect(buildLeadTrace(data).hubspot.remoteForm).toMatchObject({ status: 'confirmed', matchedSubmissionId: SUBMISSION, nativeSubmissionId: OTHER })
    expect(buildLeadTrace(data).issueCodes).not.toContain('HUBSPOT_FORM_CORRELATION_MISMATCH')
    data.remoteHubspot.formSubmission = { status: 'confirmed', correlation: 'time_email_fields', nativeSubmissionId: OTHER }
    expect(buildLeadTrace(data).hubspot.remoteForm).toMatchObject({ status: 'correlated' })
  })

  it('retains the canonical fatt-prefixed attempt ID as operational provenance', () => {
    const data = input()

    data.hubspotAttempts = [{ ...attempt(), attempt_id: 'fatt-a1111111-1111-4111-8111-111111111111' }]
    expect(buildLeadTrace(data).hubspot.localAttempt.attempts[0].attemptId).toBe('fatt-a1111111-1111-4111-8111-111111111111')
  })

})
