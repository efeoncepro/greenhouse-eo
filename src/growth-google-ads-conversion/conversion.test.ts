import { describe, expect, it, vi } from 'vitest'

import { emitGoogleAdsConversion, parseGoogleAdsConversionReceipt, type GoogleAdsConversionReceipt } from './conversion'

const receipt = (overrides: Partial<GoogleAdsConversionReceipt> = {}): GoogleAdsConversionReceipt => {
 const now=Date.now()

 return {
  version: 1, transactionId: '11111111-1111-4111-8111-111111111111', conversionKey: 'commercial_lead',
  issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 600_000).toISOString(),
  userData: { sha256_email_address: 'a'.repeat(64) }, ...overrides,
 }
}

const browser = () => {
  const attributes = new Map<string, string>([
    ['data-efeonce-ads-consent', 'granted'], ['data-efeonce-analytics-consent', 'granted'],
    ...['ad-storage', 'ad-user-data', 'ad-personalization', 'analytics-storage'].map(key => [`data-efeonce-google-${key}`, 'granted'] as const),
  ])

  const listeners = new Map<string, () => void>()

  const win = {
    location: { hostname: 'efeoncepro.com' }, navigator: { globalPrivacyControl: false }, dataLayer: [] as Record<string, unknown>[],
    document: { documentElement: { getAttribute: (key: string) => attributes.get(key) ?? null } },
    setTimeout: vi.fn(), addEventListener: (key: string, callback: () => void) => listeners.set(key, callback),
  } as unknown as Window & {
    dataLayer: Record<string, unknown>[]
    efeonceReadGoogleAdsUserData: (id: string) => Record<string, string> | undefined
  }

  return { win, attributes, listeners }
}

describe('reserved browser Ads conversion channel', () => {
  it('keeps hashes out of dataLayer and retains them only until event callback', () => {
    const { win } = browser()
    const value = receipt()

    expect(emitGoogleAdsConversion(value, 'commercial_lead', win)).toBe(true)
    expect(win.dataLayer).toHaveLength(1)
    expect(win.dataLayer[0]).toMatchObject({ event: 'gh_ads_conversion', transaction_id: value.transactionId, ads_conversion_key: 'commercial_lead' })
    expect(JSON.stringify(win.dataLayer)).not.toContain('a'.repeat(64))
    expect(Object.keys(win)).not.toContain('efeonceReadGoogleAdsUserData')
    const read = win.efeonceReadGoogleAdsUserData(value.transactionId)!

    read.sha256_email_address = 'b'.repeat(64)
    expect(win.efeonceReadGoogleAdsUserData(value.transactionId)?.sha256_email_address).toBe('a'.repeat(64))
    ;(win.dataLayer[0].eventCallback as () => void)()
    expect(win.efeonceReadGoogleAdsUserData(value.transactionId)).toBeUndefined()
    expect(emitGoogleAdsConversion(value, 'commercial_lead', win)).toBe(false)
  })
  it('shares dedup through one window bridge and clears data on timeout', () => {
    const { win } = browser()
    const value = receipt()

    emitGoogleAdsConversion(value, 'commercial_lead', win)
    expect(emitGoogleAdsConversion({ ...value }, 'commercial_lead', win)).toBe(false)
    const timer = vi.mocked(win.setTimeout).mock.calls[0]

    expect(timer[1]).toBeLessThanOrEqual(10_000)
    ;(timer[0] as () => void)()
    expect(win.efeonceReadGoogleAdsUserData(value.transactionId)).toBeUndefined()
  })
  it.each(['ad-storage', 'ad-user-data', 'ad-personalization', 'analytics-storage'])('fails closed on missing or denied %s', key => {
    for (const state of [undefined, 'denied']) {
      const { win, attributes } = browser()

      if (state) attributes.set(`data-efeonce-google-${key}`, state)
      else attributes.delete(`data-efeonce-google-${key}`)
      expect(emitGoogleAdsConversion(receipt(), 'commercial_lead', win)).toBe(false)
      expect(win.dataLayer).toHaveLength(0)
    }
  })
  it('revocation clears material immediately and regrant never resets dedup', () => {
    const { win, attributes, listeners } = browser()
    const value = receipt()

    emitGoogleAdsConversion(value, 'commercial_lead', win)
    attributes.set('data-efeonce-google-ad-user-data', 'denied')
    listeners.get('efeonce:privacy-consent')!()
    attributes.set('data-efeonce-google-ad-user-data', 'granted')
    expect(win.efeonceReadGoogleAdsUserData(value.transactionId)).toBeUndefined()
    expect(emitGoogleAdsConversion(value, 'commercial_lead', win)).toBe(false)
  })
  it('GPC and pagehide erase private material', () => {
    const { win, listeners } = browser()
    const value = receipt()

    emitGoogleAdsConversion(value, 'commercial_lead', win)
    listeners.get('pagehide')!()
    expect(win.efeonceReadGoogleAdsUserData(value.transactionId)).toBeUndefined()
    Object.assign(win.navigator, { globalPrivacyControl: true })
    expect(emitGoogleAdsConversion(receipt({ transactionId: '22222222-2222-4222-8222-222222222222' }), 'commercial_lead', win)).toBe(false)
  })
  it('never invents enhanced data or changes existing ordinary events', () => {
    const { win } = browser()

    win.dataLayer.push({ event: 'generate_lead' })
    expect(emitGoogleAdsConversion(receipt({ userData: undefined }), 'commercial_lead', win)).toBe(true)
    expect(win.dataLayer[0]).toEqual({ event: 'generate_lead' })
    expect(win.efeonceReadGoogleAdsUserData(receipt().transactionId)).toBeUndefined()
  })
  it.each([
    { conversionKey: 'meeting_booking' }, { version: 2 }, { transactionId: 'contact@email.test' },
    { expiresAt: new Date(Date.now() - 1).toISOString() },
    { issuedAt: new Date(Date.now() + 60_000).toISOString() },
    { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
    { issuedAt: new Date(Date.now() - 601_000).toISOString() },
    { userData: { email: 'person@example.test' } }, { userData: {} },
    { userData: { sha256_email_address: 'invalid' } }, { gclid: 'must-not-escape' },
  ])('discards tampered, expired, or wrong-purpose receipt %j', patch => {
    expect(parseGoogleAdsConversionReceipt({ ...receipt(), ...patch }, 'commercial_lead')).toBeUndefined()
  })
  it('does not permit off-host emission or instrumentation errors to throw', () => {
    const { win } = browser()

    Object.assign(win.location, { hostname: 'unapproved.example' })
    expect(emitGoogleAdsConversion(receipt(), 'commercial_lead', win)).toBe(false)
    expect(emitGoogleAdsConversion(receipt(), 'commercial_lead', Object.freeze({}) as Window)).toBe(false)
  })
})
