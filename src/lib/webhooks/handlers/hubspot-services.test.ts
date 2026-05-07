import { createHmac } from 'node:crypto'

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const batchReadMock = vi.fn(async () => [
  {
    id: '551519372424',
    properties: {
      hs_name: 'Sky Airline - Diseño digital',
      ef_linea_de_servicio: undefined as string | undefined
    }
  }
])

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

global.fetch = fetchMock as unknown as typeof fetch

// buildResponse no longer needed in async refactor — webhook ya no hace
// HubSpot fetch en request path. Mantenido como referencia para tests futuros.
// Removed to satisfy no-unused-vars.

const captureMock = vi.fn()
const queryMock = vi.fn()
const publishMock = vi.fn(async () => 'outbox-1')

vi.mock('@/lib/hubspot/list-services-for-company', () => ({
  batchReadServices: batchReadMock,
  listServiceIdsForCompany: vi.fn(),
  fetchServicesForCompany: vi.fn()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: captureMock
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: queryMock
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: publishMock
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

const TARGET_URI = 'https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services'

const buildHubSpotSignature = (rawBody: string, timestamp: string, secret: string): string => {
  const message = `POST${TARGET_URI}${rawBody}${timestamp}`

  return createHmac('sha256', secret).update(message).digest('base64')
}

const buildInboxEvent = (headers: Record<string, string>) => ({
  webhook_inbox_event_id: 'inbox-1',
  webhook_endpoint_id: 'webhook-hubspot-services',
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
  batchReadMock.mockClear()
  captureMock.mockClear()
  queryMock.mockReset()
  publishMock.mockClear()
  fetchMock.mockReset()
  process.env.HUBSPOT_ACCESS_TOKEN = 'test-hs-token'
  await import('./hubspot-services')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hubspot-services webhook handler', () => {
  it('rechaza request sin firma válida', async () => {
    const handler = handlersByCode['hubspot-services']
    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)

    const headers = {
      'x-hubspot-signature-v3': 'invalid',
      'x-hubspot-request-timestamp': String(Date.now()),
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/signature validation failed/i)
    expect(batchReadMock).not.toHaveBeenCalled()
  })

  it('rechaza request con timestamp expirado (>5 min)', async () => {
    const handler = handlersByCode['hubspot-services']
    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)
    const expiredTs = String(Date.now() - 6 * 60 * 1000)
    const sig = buildHubSpotSignature(rawBody, expiredTs, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': expiredTs,
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/signature validation failed/i)
    expect(batchReadMock).not.toHaveBeenCalled()
  })

  it('post async refactor: webhook emite outbox event y retorna inmediato sin fetch HubSpot', async () => {
    // TASK-813b: el handler ya no hace HubSpot fetch en el request path.
    // Solo emite outbox event `commercial.service_engagement.intake_requested`
    // que la projection hubspot_services_intake consume async via cron.
    const handler = handlersByCode['hubspot-services']
    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await handler(buildInboxEvent(headers), rawBody, events)

    // No HubSpot fetch in request path
    expect(batchReadMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    // No DB queries in request path
    expect(queryMock).not.toHaveBeenCalled()

    // Solo 1 outbox event emitido (intake_requested)
    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'commercial.service_engagement.intake_requested',
        aggregateType: 'hubspot_services_batch',
        payload: expect.objectContaining({
          version: 1,
          serviceIds: ['551519372424'],
          source: 'hubspot-services-webhook-direct'
        })
      })
    )
  })

  it('async: deduplica multiple events por service_id en el batch', async () => {
    const handler = handlersByCode['hubspot-services']

    const events = [
      { subscriptionType: 'p_services.creation', objectId: 111 },
      { subscriptionType: 'p_services.propertyChange', objectId: 111, propertyName: 'hs_name' },
      { subscriptionType: 'p_services.creation', objectId: 222 }
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

    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          serviceIds: ['111', '222']
        })
      })
    )
  })

  it('async: acepta multiple subscriptionType formats (service.* / p_services.* / 0-162.*)', async () => {
    const handler = handlersByCode['hubspot-services']

    const events = [
      { subscriptionType: 'service.creation', objectId: 100 },
      { subscriptionType: 'p_services.propertyChange', objectId: 200 },
      { subscriptionType: '0-162.propertyChange', objectId: 300 }
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

    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          serviceIds: expect.arrayContaining(['100', '200', '300'])
        })
      })
    )
  })

  it('skip cuando no hay events o no hay services p_services.*', async () => {
    const handler = handlersByCode['hubspot-services']
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

    expect(batchReadMock).not.toHaveBeenCalled()
    expect(publishMock).not.toHaveBeenCalled()
  })
})
