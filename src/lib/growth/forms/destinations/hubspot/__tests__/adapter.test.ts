import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSecureSubmitBody, deliverToHubSpotForms } from '../adapter'
import type { FormConsentSnapshotRow, FormDestinationRow, FormSubmissionRow } from '@/lib/growth/forms/store'

const ENV_ON = {
  GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED: 'true',
  HUBSPOT_ACCESS_TOKEN: 'test-token',
} as unknown as NodeJS.ProcessEnv

const submission = (fields: Record<string, unknown> = { email: 'lead@example.com', name: 'Lead' }): FormSubmissionRow => ({
  submission_id: 'fsub-1',
  form_id: 'fdef-1',
  form_version_id: 'fver-1',
  surface_id: null,
  page_uri: 'https://efeoncepro.com/lp',
  page_name: 'LP',
  lead_email_hash: 'hash',
  normalized_fields_json: fields,
  encrypted_fields_json: {},
  status: 'accepted',
  rejection_reason_class: null,
  dedupe_fingerprint: 'fp',
  request_id: null,
  ip_hash: null,
  delivery_attempts: 0,
  next_attempt_at: null,
  created_at: new Date(),
  updated_at: new Date(),
})

const consent = (): FormConsentSnapshotRow => ({
  submission_id: 'fsub-1',
  consent_policy_version: 'v1',
  legal_basis: 'consent',
  checkboxes_json: ['privacy'],
  notice_text_hash: 'h',
  privacy_url: 'https://efeoncepro.com/privacy',
  created_at: new Date(),
})

const destination = (mapping: unknown): FormDestinationRow => ({
  destination_id: 'fdst-1',
  form_version_id: 'fver-1',
  provider: 'hubspot',
  adapter_kind: 'hubspot_forms_secure_submit',
  adapter_version: 'hsforms-v3-secure-submit',
  endpoint_status: 'legacy_supported',
  enabled: true,
  delivery_mode: 'direct',
  mapping_json: mapping,
  consent_requirements_json: {},
  retry_policy_json: {},
  created_at: new Date(),
})

const VALID_MAPPING = { portalId: '48713323', formGuid: 'guid-123', fieldMapping: { email: 'email', name: 'firstname' } }

afterEach(() => vi.restoreAllMocks())

describe('buildSecureSubmitBody', () => {
  it('mapea sólo los campos allowlisteados + legalConsentOptions', () => {
    const body = buildSecureSubmitBody(submission({ email: 'a@b.com', name: 'A', secret: 'X' }), consent(), VALID_MAPPING)

    expect(body.fields).toEqual([
      { name: 'email', value: 'a@b.com' },
      { name: 'firstname', value: 'A' },
    ])
    // `secret` no está en el fieldMapping → no se envía.
    expect(JSON.stringify(body)).not.toContain('secret')
    expect((body.legalConsentOptions as { consent: { consentToProcess: boolean } }).consent.consentToProcess).toBe(true)
  })
})

describe('deliverToHubSpotForms', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('flag OFF → skipped (sin llamar a HubSpot)', async () => {
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination(VALID_MAPPING), env: {} as NodeJS.ProcessEnv })

    expect(r.status).toBe('skipped')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('mapping sin portalId/formGuid → failed mapping_incomplete (no retryable)', async () => {
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination({ fieldMapping: { email: 'email' } }), env: ENV_ON })

    expect(r).toMatchObject({ status: 'failed', errorClass: 'mapping_incomplete', retryable: false })
  })

  it('field mapping vacío → failed empty_field_mapping', async () => {
    const r = await deliverToHubSpotForms({ submission: submission({ other: 'x' }), consent: consent(), destination: destination(VALID_MAPPING), env: ENV_ON })

    expect(r).toMatchObject({ status: 'failed', errorClass: 'empty_field_mapping' })
  })

  it('200 → succeeded', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200 })
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination(VALID_MAPPING), env: ENV_ON })

    expect(r.status).toBe('succeeded')
    expect(r.externalId).toContain('hsforms-')
  })

  it('400 → validation_error (no retryable)', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 400 })
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination(VALID_MAPPING), env: ENV_ON })

    expect(r).toMatchObject({ status: 'failed', errorClass: 'validation_error', retryable: false })
  })

  it('401 → auth_error (no retryable)', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 401 })
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination(VALID_MAPPING), env: ENV_ON })

    expect(r).toMatchObject({ status: 'failed', errorClass: 'auth_error', retryable: false })
  })

  it('429 → rate_limited (retryable)', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 429 })
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination(VALID_MAPPING), env: ENV_ON })

    expect(r).toMatchObject({ status: 'failed', errorClass: 'rate_limited', retryable: true })
  })

  it('timeout → failed timeout (retryable), sin filtrar payload', async () => {
    const err = new Error('timeout')

    err.name = 'TimeoutError'
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(err)
    const r = await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: destination(VALID_MAPPING), env: ENV_ON })

    expect(r).toMatchObject({ status: 'failed', errorClass: 'timeout', retryable: true })
  })
})
