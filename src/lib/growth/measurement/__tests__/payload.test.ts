import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { policyFixture, sourceKey, sourceVersion } from './policy-fixture'

import { buildMatchingData, buildMeasurementPayloads, safeMeasurementUrl } from '../payload'

const now = new Date('2026-10-13T20:00:00Z')

const context = {
  source: 'hubspot_categories', policyVersion: 'efeonce-categories-2026-10-13',
  capturedAt: now.toISOString(), advertisement: true, analytics: true, globalPrivacyControl: false,
  clientId: '123456.1234567890',
} as const

const input = {
  policy: policyFixture(),
  scope: { sourceKind: 'form_submission', sourceId: 'fixture', sourceKey, sourceVersion, origin: 'https://efeoncepro.com',
    pageUri: 'https://efeoncepro.com/aeo-2/?email=private@example.com#secret',
    surfaceId: 'fhsf-aeo', formSlug: 'efeonce-aeo-diagnostic' } as const,
  contact: { email: ' QA.Meta+Lead@Example.com ', phone: '+1 (202) 555-0148', firstName: 'José María', lastName: "O’Neill" },
  measurementContext: context, ip: '192.0.2.1', userAgent: 'Synthetic UA', now,
  eventId: 'a879b155-a143-40bd-9b15-731c2b62d173',
}

describe('destination-specific Lead matching', () => {
  it('honors the request GPC veto even if the client body claims it is false', () => {
    expect(buildMeasurementPayloads({ ...input, requestGlobalPrivacyControl: true })).toBeNull()
  })
  it('uses independent Meta/Google phone normalization and a known Meta email vector', () => {
    const hashes = buildMatchingData(input.contact)

    expect(hashes.meta['x-fb-ud-em']).toBe('9225ebe3d2bb00b0a3c9fe063e958f1139af30790c4fdbbc73e556f5a2d6444c')
    expect(hashes.meta['x-fb-ud-ph']).toBe('3fb5ff1352da37a27013ceb0a0c9e7c4a5824385d06eea100df192d969af8982')
    expect(hashes.meta['x-fb-ud-fn']).toBe('a6a9049d39c4dd1cc332a44c64da6e6ce99e4ddbc1e9b6595e7f7bad60ef5ef6')
    expect(hashes.google.sha256_phone_number?.[0]).not.toBe(hashes.meta['x-fb-ud-ph'])
  })
  it('preserves Gmail dots for Meta and removes them only for Google', () => {
    const dotted = buildMatchingData({ email: 'a.b+lead@gmail.com' })
    const plain = buildMatchingData({ email: 'ab+lead@gmail.com' })

    expect(dotted.meta['x-fb-ud-em']).not.toBe(plain.meta['x-fb-ud-em'])
    expect(dotted.google.sha256_email_address).toEqual(plain.google.sha256_email_address)
  })
  it('never guesses a country or splits a full name', () => {
    expect(buildMatchingData({ phone: '2025550148' }).hasIdentity).toBe(false)
    expect(buildMatchingData({ email: 'qa@example.com' }).meta).not.toHaveProperty('x-fb-ud-ln')
  })
  it('keeps external contact identity stable across submissions and normalizes Unicode punctuation', () => {
    const hash = (s: string) => createHash('sha256').update(s).digest('hex')
    const matching = buildMatchingData({ email: ' QA .Meta+Lead@Example.com ', lastName: ' O’Neill—Smith! ' })

    expect(matching.meta['x-fb-ud-external_id']).toBe(hash('qa.meta+lead@example.com'))
    expect(matching.meta['x-fb-ud-external_id']).toBe(matching.meta['x-fb-ud-em'])
    expect(matching.meta['x-fb-ud-ln']).toBe(hash('oneillsmith'))
  })
  it('forwards original visitor context without hashing IP, UA or cookie identifiers', () => {
    const cookies = { fbp: 'fb.1.1791921600000.1234', fbc: 'fb.1.1791921600000.actual-click' }
    const payload = buildMeasurementPayloads({ ...input, measurementContext: { ...context, ...cookies } })!

    expect(payload.meta.ip_override).toBe(input.ip)
    expect(payload.meta.user_agent).toBe(input.userAgent)
    expect(payload.meta['x-fb-ck-fbp']).toBe(cookies.fbp)
    expect(payload.meta['x-fb-ck-fbc']).toBe(cookies.fbc)
    expect(payload.meta.action_source).toBe('website')
    expect(payload.meta.event_time).toBe(Math.floor(now.getTime() / 1000))
    expect(payload.meta.event_id).toBe(input.eventId)
  })
  it('produces a clean URL, explicit classification and Google user-data-only', () => {
    const payload = buildMeasurementPayloads(input)!

    expect(payload.meta.page_location).toBe('https://efeoncepro.com/aeo-2/')
    expect(JSON.parse(payload.meta.custom_properties)).toEqual({ lead_source: 'growth_form', surface_id: 'fhsf-aeo', form_slug: 'efeonce-aeo-diagnostic' })
    expect(payload.google).not.toHaveProperty('events')
    expect(payload.google).not.toHaveProperty('user_id')
    expect(JSON.stringify(payload)).not.toContain('QA.Meta+Lead')
    expect(JSON.stringify(payload)).not.toContain('private@example.com')
  })
  it.each([
    undefined, { ...context, advertisement: false }, { ...context, globalPrivacyControl: true },
    { ...context, advertisement: 'true' }, { ...context, capturedAt: '2026-10-12T20:00:00Z' },
    { ...context, extraContact: 'qa@example.com' },
  ])('blocks unknown, denied, GPC, stale and malformed advertising context', measurementContext => {
    expect(buildMeasurementPayloads({ ...input, measurementContext })).toBeNull()
  })
  it('advertising-only consent sends Meta but never Google enrichment', () => {
    expect(buildMeasurementPayloads({ ...input, measurementContext: { ...context, analytics: false } })?.google).toBeNull()
  })
  it('missing client_id keeps Meta but does not invent a Google visitor', () => {
    expect(buildMeasurementPayloads({ ...input, measurementContext: { ...context, clientId: undefined } })?.google).toBeNull()
  })
  it('requires an active published scope instead of a hardcoded slug', () => {
    expect(buildMeasurementPayloads({...input,policy:undefined})).toBeNull()
    expect(buildMeasurementPayloads({...input,policy:policyFixture({state:'disabled'})})).toBeNull()
    expect(buildMeasurementPayloads({...input,scope:{...input.scope,sourceKey:'another-source'}})).toBeNull()
    expect(buildMeasurementPayloads({...input,scope:{...input.scope,formSlug:'new-commercial-form'}})).not.toBeNull()
  })
  it('confirmed scheduler uses booking classification only', () => {
    const meetingScope={sourceKind:'meeting_booking' as const,sourceKey:'discovery',surfaceId:'fhsf-efeonce-lead-gen-web'}
    const policy=policyFixture({scope:meetingScope,config:{...input.policy.config,sourceVersion:'ab'.repeat(32),origins:['https://think.efeoncepro.com']}})

    const payload = buildMeasurementPayloads({ ...input, policy, scope: {
      ...meetingScope, sourceVersion:policy.config.sourceVersion, sourceKind: 'meeting_booking', sourceId: 'fixture-booking', origin: 'https://think.efeoncepro.com',
      pageUri: '/web-agentica/', surfaceId: 'fhsf-efeonce-lead-gen-web', schedulerKey: 'discovery',
    } })!

    expect(JSON.parse(payload.meta.custom_properties)).toEqual({ lead_source: 'meeting_booking', surface_id: 'fhsf-efeonce-lead-gen-web', scheduler_key: 'discovery' })
  })
  it.each([
    ['https://other.example.com', '/'], ['http://efeoncepro.com', '/'],
    ['https://efeoncepro.com', 'https://think.efeoncepro.com/'],
    ['https://efeoncepro.com', '/shared/private-token/'],
    ['https://efeoncepro.com', '/report/private-token/'],
    ['https://efeoncepro.com', '/path@example.com/'],
  ])('rejects cross-origin and personal/token paths', (origin, path) => {
    expect(safeMeasurementUrl(origin, path)).toBeNull()
  })
})
