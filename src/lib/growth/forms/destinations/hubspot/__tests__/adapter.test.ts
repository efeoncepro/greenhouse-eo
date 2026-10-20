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

  it('mapea nombres derivados a firstname/lastname sin enviar fullName si no está allowlisteado', () => {
    const body = buildSecureSubmitBody(
      submission({ email: 'ana@example.com', fullName: 'Ana Silva', firstName: 'Ana', lastName: 'Silva' }),
      consent(),
      { ...VALID_MAPPING, fieldMapping: { email: 'email', firstName: 'firstname', lastName: 'lastname' } },
    )

    expect(body.fields).toEqual([
      { name: 'email', value: 'ana@example.com' },
      { name: 'firstname', value: 'Ana' },
      { name: 'lastname', value: 'Silva' },
    ])
    expect(JSON.stringify(body)).not.toContain('fullName')
  })
})

describe('legalConsentOptions.communications (suscripción de marketing)', () => {
  const MARKETING_TEXT = 'Quiero recibir novedades y contenidos de Efeonce. Puedes darte de baja cuando quieras.'

  const MARKETING_MAPPING = {
    ...VALID_MAPPING,
    communications: [{ checkboxKey: 'marketing_updates', subscriptionTypeId: 535702717, text: MARKETING_TEXT }],
  }

  const consentWith = (checkboxes: unknown): FormConsentSnapshotRow => ({ ...consent(), checkboxes_json: checkboxes })

  const communicationsOf = (body: Record<string, unknown>) =>
    (body.legalConsentOptions as { consent: { communications: unknown[] } }).consent.communications

  it('casilla marcada + subscriptionTypeId declarado → envía la suscripción con el texto exacto', () => {
    const body = buildSecureSubmitBody(submission(), consentWith(['contact_permission', 'marketing_updates']), MARKETING_MAPPING)

    expect(communicationsOf(body)).toEqual([{ value: true, subscriptionTypeId: 535702717, text: MARKETING_TEXT }])
    expect((body.legalConsentOptions as { consent: { consentToProcess: boolean } }).consent.consentToProcess).toBe(true)
  })

  it('casilla NO marcada → no envía suscripción', () => {
    const body = buildSecureSubmitBody(submission(), consentWith(['contact_permission']), MARKETING_MAPPING)

    expect(communicationsOf(body)).toEqual([])
  })

  it('casilla marcada pero el destino no declara subscriptionTypeId → no envía suscripción', () => {
    const body = buildSecureSubmitBody(submission(), consentWith(['contact_permission', 'marketing_updates']), VALID_MAPPING)

    expect(communicationsOf(body)).toEqual([])
  })

  it('snapshot con checkboxes_json no-array → no envía suscripción', () => {
    const body = buildSecureSubmitBody(submission(), consentWith({ marketing_updates: true }), MARKETING_MAPPING)

    expect(communicationsOf(body)).toEqual([])
  })

  it('declaración mal formada → failed invalid_communications_mapping antes del POST', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const result = await deliverToHubSpotForms({
      submission: submission(),
      consent: consentWith(['marketing_updates']),
      destination: destination({ ...VALID_MAPPING, communications: [{ checkboxKey: 'marketing_updates', subscriptionTypeId: '535702717', text: MARKETING_TEXT }] }),
      env: ENV_ON,
    })

    expect(result).toMatchObject({ status: 'failed', errorClass: 'invalid_communications_mapping', retryable: false })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('entrega real: el POST lleva la suscripción sólo cuando la casilla viene marcada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    await deliverToHubSpotForms({ submission: submission(), consent: consentWith(['marketing_updates']), destination: destination(MARKETING_MAPPING), env: ENV_ON })
    await deliverToHubSpotForms({ submission: submission(), consent: consentWith([]), destination: destination(MARKETING_MAPPING), env: ENV_ON })

    const [marked, unmarked] = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(call => JSON.parse(call[1].body))

    expect(marked.legalConsentOptions.consent.communications).toEqual([{ value: true, subscriptionTypeId: 535702717, text: MARKETING_TEXT }])
    expect(unmarked.legalConsentOptions.consent.communications).toEqual([])
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

  it('sends the server occurrence marker and keeps a pending receipt after HTTP 200 without a native ID', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200, json: () => { throw new Error('body unavailable') } })
    const source = { ...submission({ email: 'a@b.com', spoof: 'attacker' }), submission_id: 'fsub-b2222222-2222-4222-8222-222222222222' }

    const mapping = { ...VALID_MAPPING, formGuid: 'd4444444-4444-4444-8444-444444444444', submissionIdProperty: 'ef_greenhouse_submission_id',
      fieldMapping: { email: 'email', spoof: 'ef_greenhouse_submission_id' } }

    const result = await deliverToHubSpotForms({ submission: source, consent: consent(), destination: destination(mapping), env: ENV_ON })
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)

    expect(body.fields).toEqual([{ name: 'email', value: 'a@b.com' }, { name: 'ef_greenhouse_submission_id', value: source.submission_id }])
    expect(result).toMatchObject({ status: 'succeeded', retryable: false, providerReceipt: { status: 'pending', markerValue: source.submission_id } })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(result)).not.toMatch(/a@b.com|attacker|redirectUri/)
  })

  it('rejects an invalid opt-in tracking mapping before making a non-idempotent POST', async () => {
    const result = await deliverToHubSpotForms({ submission: submission(), consent: consent(),
      destination: destination({ ...VALID_MAPPING, submissionIdProperty: 'email' }), env: ENV_ON })

    expect(result).toMatchObject({ status: 'failed', errorClass: 'invalid_submission_id_mapping', retryable: false })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a mismatched provider before POST, so receipt persistence cannot cause a duplicate submission', async () => {
    const target = { ...destination(VALID_MAPPING), provider: 'email' }

    expect(await deliverToHubSpotForms({ submission: submission(), consent: consent(), destination: target, env: ENV_ON }))
      .toMatchObject({ status: 'failed', errorClass: 'hubspot_destination_mismatch', retryable: false })
    expect(fetch).not.toHaveBeenCalled()
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
