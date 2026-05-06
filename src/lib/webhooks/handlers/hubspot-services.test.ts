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

const buildResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

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

  it('procesa p_services.creation y materializa via UPSERT con outbox event', async () => {
    const handler = handlersByCode['hubspot-services']
    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    // 1ra llamada: association lookup HubSpot → company id
    fetchMock.mockResolvedValueOnce(
      buildResponse({ results: [{ toObjectId: 30825221458 }] }))

    // 2nda+: PG queries (space lookup + INSERT/UPDATE)
    queryMock
      .mockResolvedValueOnce([
        {
          space_id: 'space-sky-airline',
          client_id: 'hubspot-company-30825221458',
          organization_id: 'org-sky'
        }
      ])
      .mockResolvedValueOnce([{ action: 'created' }])

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await handler(buildInboxEvent(headers), rawBody, events)

    expect(batchReadMock).toHaveBeenCalledWith(['551519372424'])
    expect(queryMock).toHaveBeenCalledTimes(2)
    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'commercial.service_engagement.materialized',
        aggregateType: 'service_engagement',
        payload: expect.objectContaining({
          version: 1,
          action: 'created',
          syncStatus: 'unmapped',
          source: 'hubspot-services-webhook'
        })
      })
    )
  })

  it('marca syncStatus=synced cuando ef_linea_de_servicio está poblado', async () => {
    const handler = handlersByCode['hubspot-services']

    batchReadMock.mockResolvedValueOnce([
      {
        id: '551519372424',
        properties: {
          hs_name: 'Sky Airline - Diseño digital',
          ef_linea_de_servicio: 'globe'
        }
      }
    ])

    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    fetchMock.mockResolvedValueOnce(
      buildResponse({ results: [{ toObjectId: 30825221458 }] }))

    queryMock
      .mockResolvedValueOnce([
        { space_id: 'space-sky', client_id: 'hubspot-company-30825221458', organization_id: 'org-sky' }
      ])
      .mockResolvedValueOnce([{ action: 'updated' }])

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await handler(buildInboxEvent(headers), rawBody, events)

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          syncStatus: 'synced',
          action: 'updated'
        })
      })
    )
  })

  it('reporta organization_unresolved cuando no hay association HubSpot', async () => {
    const handler = handlersByCode['hubspot-services']
    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    // No association
    fetchMock.mockResolvedValueOnce(
      buildResponse({ results: [] }))

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    // Single service failed (organization_unresolved) → throw con prefix
    // audit-friendly para que reliability signal lo detecte vía LIKE.
    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/^organization_unresolved:/)

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/^organization_unresolved:/) }),
      'integrations.hubspot',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ reason: 'no_company_association' })
      })
    )
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('reporta organization_unresolved cuando company existe pero no hay space en GH', async () => {
    const handler = handlersByCode['hubspot-services']
    const events = [{ subscriptionType: 'p_services.creation', objectId: 551519372424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    fetchMock.mockResolvedValueOnce(
      buildResponse({ results: [{ toObjectId: 99999 }] }))

    // No space found
    queryMock.mockResolvedValueOnce([])

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/^organization_unresolved:/)

    expect(captureMock).toHaveBeenCalledTimes(1)
    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/^organization_unresolved:.*:99999$/) }),
      'integrations.hubspot',
      expect.objectContaining({
        tags: expect.objectContaining({ reason: 'no_greenhouse_space' })
      })
    )
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('lanza error cuando TODOS los services fallan (HubSpot reintentará)', async () => {
    const handler = handlersByCode['hubspot-services']

    batchReadMock.mockResolvedValueOnce([
      { id: '111', properties: { hs_name: 'svc 111', ef_linea_de_servicio: undefined } },
      { id: '222', properties: { hs_name: 'svc 222', ef_linea_de_servicio: undefined } }
    ])

    const events = [
      { subscriptionType: 'p_services.creation', objectId: 111 },
      { subscriptionType: 'p_services.creation', objectId: 222 }
    ]

    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    // Both lookups return no association → both unresolved
    fetchMock.mockResolvedValue(buildResponse({ results: [] }))

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    // Cuando todos los failures son organization_unresolved, el throw lleva
    // prefix audit-friendly. Aceptamos el prefix tanto en mensaje raw como
    // dentro del fallback "All N service syncs failed: organization_unresolved:..."
    // (defensive — resilient to refactor future del path de error).
    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/organization_unresolved:/)
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
