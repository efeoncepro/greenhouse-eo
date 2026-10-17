import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecret: vi.fn() }))
vi.mock('../policy-source', () => ({ resolveMeasurementSource: vi.fn() }))
vi.mock('../policy-store', () => ({ resolvePublishedMeasurementPolicy: vi.fn() }))

import { resolveSecret } from '@/lib/secrets/secret-manager'
import { publicMeasurementContextSchema } from '../contracts'
import { decryptMeasurementPayload } from '../crypto'
import { googleAdsConversionReceiptSchema, publishedGoogleAdsReceipt } from '../google-ads-receipt'
import { buildMeasurementPayloads } from '../payload'
import { validateMeasurementMapping, type MeasurementPolicyConfig } from '../policy-contract'
import { resolvePublishedMeasurementPolicy } from '../policy-store'
import { resolveMeasurementSource } from '../policy-source'
import { prepareMeasurementConversion } from '../prepare'
import { policyFixture } from './policy-fixture'

const now = new Date('2026-10-17T20:00:00.000Z')
const id = 'a879b155-a143-40bd-9b15-731c2b62d173'
const base = policyFixture()

const config: MeasurementPolicyConfig = { ...base.config, destinations: [], googleAds: {
  conversionKey: 'commercial_lead', enhancedConversions: true, activationAt: '2026-10-17T19:00:00.000Z',
} }

const policy = { ...base, config }

const consent = { source: 'hubspot_categories', policyVersion: 'efeonce-categories-2026-10-13', capturedAt: now.toISOString(),
  advertisement: true, analytics: true, globalPrivacyControl: false,
  googleConsent: { adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted', analyticsStorage: 'granted' } }

const input = { scope: { ...policy.scope, sourceId: 'fixture', sourceVersion: config.sourceVersion,
  origin: 'https://efeoncepro.com', pageUri: '/contacto/' }, policy,
  contact: { email: 'Test.Email@gmail.com', phone: '+56 9 1234 5678' }, measurementContext: consent, now, eventId: id, googleAdsEnabled: true }

const hash = (value: string) => createHash('sha256').update(value).digest('hex')

const source = { scope: policy.scope, name: 'Fixture', sourceVersion: config.sourceVersion, origins: [...config.origins],
  fields: [{ key: 'email', type: 'email' as const }], blockingReasons: [], googleAdsEligible: true }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(resolvePublishedMeasurementPolicy).mockResolvedValue(policy)
  vi.mocked(resolveMeasurementSource).mockResolvedValue(source)
  vi.mocked(resolveSecret).mockResolvedValue({ value: 'ab'.repeat(32), source: 'env' } as Awaited<ReturnType<typeof resolveSecret>>)
})

describe('Google Ads dedicated accepted-occurrence receipt', () => {
  it('normalizes Google identity, keeps transaction UUID, and expires the handoff after 10 minutes', () => {
    const result = buildMeasurementPayloads(input)!

    expect(result.googleAdsConversion).toEqual({ version: 1, transactionId: id, conversionKey: 'commercial_lead',
      issuedAt: now.toISOString(), expiresAt: '2026-10-17T20:10:00.000Z',
      userData: { sha256_email_address: hash('testemail@gmail.com'), sha256_phone_number: hash('+56912345678') } })
    expect(result.google).toBeNull()
    expect(JSON.stringify(result.googleAdsConversion)).not.toContain('@')
  })
  it.each(['adStorage', 'adUserData', 'adPersonalization', 'analyticsStorage'] as const)('requires explicit Google permission %s', key => {
    expect(buildMeasurementPayloads({ ...input, measurementContext: { ...consent, googleConsent: { ...consent.googleConsent, [key]: 'denied' } } })!.googleAdsConversion).toBeUndefined()
  })
  it.each([
    { ...consent, googleConsent: undefined }, { ...consent, googleConsent: { adStorage: 'granted' } },
    { ...consent, analytics: false },
  ])('never infers missing Google permissions from the legacy advertisement flag', measurementContext => {
    expect(buildMeasurementPayloads({ ...input, measurementContext })!.googleAdsConversion).toBeUndefined()
  })
  it('retains existing Meta payload when the optional Google context is malformed', () => {
    const result = buildMeasurementPayloads({ ...input, measurementContext: { ...consent, googleConsent: 'wrong' } })!

    expect(result.meta.event_id).toBe(id)
    expect(result.googleAdsConversion).toBeUndefined()
    expect(publicMeasurementContextSchema.safeParse({ ...consent, googleClick: { gclid: 'invalid@value' } }).success).toBe(true)
  })
  it('defaults the global activation flag off and respects activationAt and source kind', () => {
    expect(buildMeasurementPayloads({ ...input, googleAdsEnabled: false })!.googleAdsConversion).toBeUndefined()
    expect(buildMeasurementPayloads({ ...input, policy: { ...policy, config: { ...config, googleAds: { ...config.googleAds!, activationAt: '2026-10-18T20:00:00.000Z' } } } })!.googleAdsConversion).toBeUndefined()
    expect(buildMeasurementPayloads({ ...input, policy: { ...policy, config: { ...config, googleAds: { ...config.googleAds!, conversionKey: 'meeting_booking' } } } })!.googleAdsConversion).toBeUndefined()
  })
  it('omits userData for standard conversion tracking', () => {
    const result = buildMeasurementPayloads({ ...input, policy: { ...policy, config: { ...config, googleAds: { ...config.googleAds!, enhancedConversions: false } } } })!

    expect(result.googleAdsConversion).toBeDefined()
    expect(result.googleAdsConversion).not.toHaveProperty('userData')
  })
  it('retains valid click context only in the encrypted server snapshot; stale and future observations are discarded', () => {
    const click = { source: 'landing_query', capturedAt: now.toISOString(), gclid: 'observed-click' }
    const result = buildMeasurementPayloads({ ...input, measurementContext: { ...consent, googleClick: click } })!

    expect(result.googleAds).toHaveProperty('click', click)
    expect(result.googleAdsConversion).not.toHaveProperty('click')

    for (const capturedAt of ['2026-09-01T20:00:00.000Z', '2026-10-18T20:00:00.000Z']) {
      expect(buildMeasurementPayloads({ ...input, measurementContext: { ...consent, googleClick: { ...click, capturedAt } } })!.googleAds).not.toHaveProperty('click')
    }
  })
  it('prepares Google-only capture with no backend delivery destination and no Meta payload', async () => {
    const prepared = (await prepareMeasurementConversion({ ...input, fields: input.contact }, { NODE_ENV: 'test',
      GROWTH_MEASUREMENT_CAPTURE_ENABLED: 'true', GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED: 'true' }))!

    const payload = decryptMeasurementPayload(prepared.encryptedPayload, 'ab'.repeat(32), prepared.eventId) as Record<string, unknown>

    expect(prepared.destinations).toEqual([])
    expect(prepared.googleAdsConversion?.transactionId).toBe(prepared.eventId)
    expect(payload.meta).toBeNull()
    expect(payload.google).toBeNull()
    expect(payload.googleAds).toMatchObject({ transactionId: prepared.eventId })
    expect(prepared.consent).not.toHaveProperty('googleClick')
  })
  it('does not create Google-only capture before the global flag is enabled', async () => {
    expect(await prepareMeasurementConversion({ ...input, fields: input.contact }, { NODE_ENV: 'test', GROWTH_MEASUREMENT_CAPTURE_ENABLED: 'true' })).toBeNull()
    expect(resolveSecret).not.toHaveBeenCalled()
  })
  it.each([
    { ...source, googleAdsEligible: false },
    { ...source, sourceVersion: 'ab'.repeat(32) },
    null,
  ])('rechecks fresh source authority before creating an Ads receipt', async currentSource => {
    vi.mocked(resolveMeasurementSource).mockResolvedValue(currentSource)
    const env = { NODE_ENV: 'test' as const, GROWTH_MEASUREMENT_CAPTURE_ENABLED: 'true', GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED: 'true' }

    expect(await prepareMeasurementConversion({ ...input, fields: input.contact }, env)).toBeNull()
    // Even a stale/mocked policy lookup must not confer Ads authority. Existing destinations stay independent.
    vi.mocked(resolvePublishedMeasurementPolicy).mockResolvedValue({ ...policy, config: { ...config, destinations: ['meta'] } })
    const prepared = await prepareMeasurementConversion({ ...input, fields: input.contact }, env)

    expect(prepared?.destinations).toEqual(['meta'])
    expect(prepared?.googleAdsConversion).toBeUndefined()
  })
  it('requires durable capture and freshness before exposing a receipt', () => {
    const receipt = buildMeasurementPayloads(input)!.googleAdsConversion!

    expect(publishedGoogleAdsReceipt(receipt, true, now)).toEqual(receipt)
    expect(publishedGoogleAdsReceipt(receipt, false, now)).toBeUndefined()
    expect(publishedGoogleAdsReceipt(receipt, true, new Date(receipt.expiresAt))).toBeUndefined()
    expect(publishedGoogleAdsReceipt(receipt, true, new Date('2026-10-17T19:59:59.000Z'))).toBeUndefined()
    expect(googleAdsConversionReceiptSchema.safeParse({ ...receipt, rawEmail: 'private@example.com' }).success).toBe(false)
  })
  it('blocks unclassified/noncommercial Forms and mismatched agenda action policies', () => {
    expect(validateMeasurementMapping(config, { ...source, googleAdsEligible: false })).toContain('google_ads_source_not_commercial')
    expect(validateMeasurementMapping({ ...config, googleAds: { ...config.googleAds!, conversionKey: 'meeting_booking' } }, source)).toContain('google_ads_conversion_source_mismatch')
  })
})
