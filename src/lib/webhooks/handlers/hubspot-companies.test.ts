import { createHmac } from 'node:crypto'

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const syncMock = vi.fn(async () => ({
  hubspotCompanyId: '27778972424',
  companyRecordId: 'crm-company-test',
  companyUpserted: true,
  contactsUpserted: 1,
  promotedSummary: null,
  capabilities: { businessLines: [], serviceModules: [] }
}))

const captureMock = vi.fn()

vi.mock('@/lib/hubspot/sync-company-by-id', () => ({
  syncHubSpotCompanyById: syncMock
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: captureMock
}))

vi.mock('@/lib/integrations/greenhouse-integration', () => ({
  syncTenantCapabilitiesFromIntegration: vi.fn(async () => null)
}))

vi.mock('@/lib/webhooks/signing', () => ({
  resolveSecret: async () => 'test-secret'
}))

const handlersByCode: Record<string, (...args: unknown[]) => Promise<void>> = {}

vi.mock('@/lib/webhooks/inbound', () => ({
  registerInboundHandler: (code: string, fn: (...args: unknown[]) => Promise<void>) => {
    handlersByCode[code] = fn
  }
}))

const TARGET_URI = 'https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies'

const buildHubSpotSignature = (rawBody: string, timestamp: string, secret: string): string => {
  const message = `POST${TARGET_URI}${rawBody}${timestamp}`

  return createHmac('sha256', secret).update(message).digest('base64')
}

const buildInboxEvent = (headers: Record<string, string>) => ({
  webhook_inbox_event_id: 'inbox-1',
  webhook_endpoint_id: 'webhook-hubspot-companies',
  provider_code: 'hubspot',
  source_event_id: null,
  idempotency_key: 'k',
  headers_json: headers,
  payload_json: {},
  raw_body_text: '',
  signature_verified: null,
  status: 'processing' as const,
  error_message: null,
  received_at: new Date().toISOString(),
  processed_at: null
})

beforeEach(async () => {
  syncMock.mockClear()
  captureMock.mockClear()
  await import('./hubspot-companies')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hubspot-companies webhook handler', () => {
  it('rechaza request sin firma válida', async () => {
    const handler = handlersByCode['hubspot-companies']
    const events = [{ subscriptionType: 'company.creation', objectId: 27778972424 }]
    const rawBody = JSON.stringify(events)

    const headers = {
      'x-hubspot-signature-v3': 'invalid',
      'x-hubspot-request-timestamp': String(Date.now()),
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/signature validation failed/i)
    expect(syncMock).not.toHaveBeenCalled()
  })

  it('rechaza request con timestamp expirado (>5 min)', async () => {
    const handler = handlersByCode['hubspot-companies']
    const events = [{ subscriptionType: 'company.creation', objectId: 27778972424 }]
    const rawBody = JSON.stringify(events)
    const expiredTs = String(Date.now() - 6 * 60 * 1000)
    const sig = buildHubSpotSignature(rawBody, expiredTs, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': expiredTs,
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/signature validation failed/i)
    expect(syncMock).not.toHaveBeenCalled()
  })

  it('procesa company.creation y dispara sync', async () => {
    const handler = handlersByCode['hubspot-companies']
    const events = [{ subscriptionType: 'company.creation', objectId: 27778972424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await handler(buildInboxEvent(headers), rawBody, events)

    expect(syncMock).toHaveBeenCalledTimes(1)
    expect(syncMock).toHaveBeenCalledWith('27778972424', expect.objectContaining({ promote: true, triggeredBy: 'hubspot-webhook' }))
  })

  it('deduplica company IDs cuando hay múltiples events para el mismo company', async () => {
    const handler = handlersByCode['hubspot-companies']

    const events = [
      { subscriptionType: 'company.creation', objectId: 27778972424 },
      { subscriptionType: 'company.propertyChange', objectId: 27778972424, propertyName: 'lifecyclestage' },
      { subscriptionType: 'contact.creation', objectId: 87940966978, associatedObjectId: 27778972424 }
    ]

    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await handler(buildInboxEvent(headers), rawBody, events)

    expect(syncMock).toHaveBeenCalledTimes(1)
    expect(syncMock).toHaveBeenCalledWith('27778972424', expect.anything())
  })

  it('continúa con otros companies si uno falla y captura el error', async () => {
    const handler = handlersByCode['hubspot-companies']

    syncMock.mockRejectedValueOnce(new Error('bridge timeout'))
    syncMock.mockResolvedValueOnce({
      hubspotCompanyId: '99999',
      companyRecordId: 'crm-company-other',
      companyUpserted: true,
      contactsUpserted: 0,
      promotedSummary: null,
      capabilities: { businessLines: [], serviceModules: [] }
    })

    const events = [
      { subscriptionType: 'company.creation', objectId: 27778972424 },
      { subscriptionType: 'company.creation', objectId: 99999 }
    ]

    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await handler(buildInboxEvent(headers), rawBody, events)

    expect(syncMock).toHaveBeenCalledTimes(2)
    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'integrations.hubspot',
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ source: 'hubspot-companies-webhook' })
      })
    )
  })

  it('lanza error cuando todos los companies fallan (HubSpot reintentará)', async () => {
    const handler = handlersByCode['hubspot-companies']

    syncMock.mockRejectedValue(new Error('bridge unreachable'))

    const events = [
      { subscriptionType: 'company.creation', objectId: 27778972424 },
      { subscriptionType: 'company.creation', objectId: 99999 }
    ]

    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/All 2 company syncs failed/)
  })
})
