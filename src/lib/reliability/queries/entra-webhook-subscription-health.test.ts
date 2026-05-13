import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))
vi.mock('@/lib/entra/webhook-subscription', () => ({
  getPersistedSubscriptionMetadata: vi.fn()
}))

const {
  evaluateSubscriptionHealth,
  getEntraWebhookSubscriptionHealthSignal,
  ENTRA_WEBHOOK_SUBSCRIPTION_HEALTH_SIGNAL_ID
} = await import('./entra-webhook-subscription-health')

const subscriptionModule = await import('@/lib/entra/webhook-subscription')
const captureModule = await import('@/lib/observability/capture')

const NOW = new Date('2026-05-13T12:00:00.000Z')

describe('evaluateSubscriptionHealth — state machine', () => {
  it('returns unknown when metadata is null (no subscription bootstrapped)', () => {
    const result = evaluateSubscriptionHealth(null, NOW)

    expect(result.severity).toBe('unknown')
    expect(result.state).toBe('unknown')
    expect(result.hoursUntilExpiry).toBeNull()
    expect(result.summary).toMatch(/no registrada/i)
  })

  it('returns unknown when subscriptionId is missing', () => {
    const result = evaluateSubscriptionHealth(
      { subscriptionId: null, expirationDateTime: '2026-05-15T00:00:00Z' },
      NOW
    )

    expect(result.severity).toBe('unknown')
    expect(result.state).toBe('unknown')
  })

  it('returns warning when expirationDateTime is missing (legacy row pre-ISSUE-075)', () => {
    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: null },
      NOW
    )

    expect(result.severity).toBe('warning')
    expect(result.state).toBe('legacy_metadata')
    expect(result.summary).toMatch(/legacy/i)
  })

  it('returns warning when expirationDateTime is malformed', () => {
    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: 'not-a-date' },
      NOW
    )

    expect(result.severity).toBe('warning')
    expect(result.state).toBe('legacy_metadata')
  })

  it('returns error when subscription already expired', () => {
    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: '2026-05-12T00:00:00.000Z' },
      NOW
    )

    expect(result.severity).toBe('error')
    expect(result.state).toBe('expired')
    expect(result.hoursUntilExpiry).toBeLessThan(0)
    expect(result.summary).toMatch(/expir/i)
  })

  it('returns error when expiry is imminent (<12h)', () => {
    const inSixHours = new Date(NOW.getTime() + 6 * 60 * 60 * 1000)

    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: inSixHours.toISOString() },
      NOW
    )

    expect(result.severity).toBe('error')
    expect(result.state).toBe('imminent')
    expect(result.hoursUntilExpiry).toBeGreaterThan(5)
    expect(result.hoursUntilExpiry).toBeLessThan(7)
  })

  it('returns warning when expiry is approaching (12h-48h)', () => {
    const inThirtyHours = new Date(NOW.getTime() + 30 * 60 * 60 * 1000)

    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: inThirtyHours.toISOString() },
      NOW
    )

    expect(result.severity).toBe('warning')
    expect(result.state).toBe('approaching')
    expect(result.hoursUntilExpiry).toBeGreaterThan(29)
    expect(result.hoursUntilExpiry).toBeLessThan(31)
  })

  it('returns ok when expiry is healthy (>48h)', () => {
    const inSeventyTwoHours = new Date(NOW.getTime() + 72 * 60 * 60 * 1000)

    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: inSeventyTwoHours.toISOString() },
      NOW
    )

    expect(result.severity).toBe('ok')
    expect(result.state).toBe('healthy')
    expect(result.hoursUntilExpiry).toBeGreaterThan(71)
  })

  it('treats exact boundary at 12h as imminent (strict inequality)', () => {
    const atTwelveHours = new Date(NOW.getTime() + 12 * 60 * 60 * 1000)

    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: atTwelveHours.toISOString() },
      NOW
    )

    // 12.0 NOT < 12 → falls into approaching bucket (warning)
    expect(result.severity).toBe('warning')
    expect(result.state).toBe('approaching')
  })

  it('treats exact boundary at 48h as approaching (strict inequality)', () => {
    const atFortyEightHours = new Date(NOW.getTime() + 48 * 60 * 60 * 1000)

    const result = evaluateSubscriptionHealth(
      { subscriptionId: 'sub-123', expirationDateTime: atFortyEightHours.toISOString() },
      NOW
    )

    // 48.0 NOT < 48 → healthy
    expect(result.severity).toBe('ok')
    expect(result.state).toBe('healthy')
  })
})

describe('getEntraWebhookSubscriptionHealthSignal — signal envelope', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('builds the canonical signal shape with module=identity, kind=drift', async () => {
    const fixture = {
      subscriptionId: 'sub-abc',
      expirationDateTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      notificationUrl: 'https://greenhouse.efeoncepro.com/api/webhooks/entra-user-change',
      lastRenewedAt: new Date().toISOString()
    }

    vi.mocked(subscriptionModule.getPersistedSubscriptionMetadata).mockResolvedValue(fixture)

    const signal = await getEntraWebhookSubscriptionHealthSignal()

    expect(signal.signalId).toBe(ENTRA_WEBHOOK_SUBSCRIPTION_HEALTH_SIGNAL_ID)
    expect(signal.signalId).toBe('identity.entra.webhook_subscription_health')
    expect(signal.moduleKey).toBe('identity')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('ok')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'state', value: 'healthy' }),
        expect.objectContaining({ label: 'subscription_id', value: 'sub-abc' })
      ])
    )
  })

  it('degrades to unknown when getPersistedSubscriptionMetadata throws', async () => {
    vi.mocked(subscriptionModule.getPersistedSubscriptionMetadata).mockRejectedValue(
      new Error('postgres connection refused')
    )

    const signal = await getEntraWebhookSubscriptionHealthSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toMatch(/no fue posible/i)
    expect(vi.mocked(captureModule.captureWithDomain)).toHaveBeenCalledWith(
      expect.any(Error),
      'identity',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'reliability_signal_entra_webhook_subscription_health'
        })
      })
    )
  })

  it('returns unknown severity when subscription not yet bootstrapped', async () => {
    vi.mocked(subscriptionModule.getPersistedSubscriptionMetadata).mockResolvedValue(null)

    const signal = await getEntraWebhookSubscriptionHealthSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'state', value: 'unknown' })
      ])
    )
  })

  it('returns error severity when subscription is expired', async () => {
    vi.mocked(subscriptionModule.getPersistedSubscriptionMetadata).mockResolvedValue({
      subscriptionId: 'sub-expired',
      expirationDateTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      notificationUrl: 'https://greenhouse.efeoncepro.com/api/webhooks/entra-user-change',
      lastRenewedAt: null
    })

    const signal = await getEntraWebhookSubscriptionHealthSignal()

    expect(signal.severity).toBe('error')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'state', value: 'expired' })
      ])
    )
  })
})
