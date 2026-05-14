import { createHmac } from 'node:crypto'

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// TASK-878 — Post async cutover, el webhook handler ya NO llama
// `syncHubSpotCompanyById` inline. Emite outbox event
// `commercial.hubspot_company.sync_requested v1` y retorna. La projection
// reactiva consume el event en ops-worker.
const publishOutboxEventMock = vi.fn(async () => 'outbox-test-id')

const captureMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: publishOutboxEventMock
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: captureMock
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
  publishOutboxEventMock.mockClear()
  publishOutboxEventMock.mockResolvedValue('outbox-test-id')
  captureMock.mockClear()
  await import('./hubspot-companies')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hubspot-companies webhook handler (TASK-878 async path)', () => {
  it('rechaza request sin firma válida — NO emite outbox event', async () => {
    const handler = handlersByCode['hubspot-companies']
    const events = [{ subscriptionType: 'company.creation', objectId: 27778972424 }]
    const rawBody = JSON.stringify(events)

    const headers = {
      'x-hubspot-signature-v3': 'invalid',
      'x-hubspot-request-timestamp': String(Date.now()),
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/signature validation failed/i)
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('rechaza request con timestamp expirado (>5 min) — NO emite outbox event', async () => {
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
    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })

  it('emite outbox event commercial.hubspot_company.sync_requested para company.creation', async () => {
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

    expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'hubspot_companies_batch',
        aggregateId: '27778972424',
        eventType: 'commercial.hubspot_company.sync_requested',
        payload: expect.objectContaining({
          version: 1,
          hubspotCompanyId: '27778972424',
          source: 'hubspot-companies-webhook'
        })
      })
    )
  })

  it('deduplica company IDs cuando hay múltiples events para el mismo company (un solo outbox event)', async () => {
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

    // Dedup → un único outbox event para el company 27778972424.
    expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
    expect(publishOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ aggregateId: '27778972424' })
    )
  })

  it('emite N outbox events distintos para N companies distintos', async () => {
    const handler = handlersByCode['hubspot-companies']

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

    expect(publishOutboxEventMock).toHaveBeenCalledTimes(2)

    const calledCompanyIds = (publishOutboxEventMock.mock.calls as unknown as Array<[{
      aggregateId: string
    }]>)
      .map(call => call[0].aggregateId)
      .sort()

    expect(calledCompanyIds).toEqual(['27778972424', '99999'])
  })

  it('rethrow + capture cuando publishOutboxEvent falla (HubSpot reintentará el batch)', async () => {
    const handler = handlersByCode['hubspot-companies']

    publishOutboxEventMock.mockRejectedValueOnce(new Error('PG unreachable'))

    const events = [{ subscriptionType: 'company.creation', objectId: 27778972424 }]
    const rawBody = JSON.stringify(events)
    const ts = String(Date.now())
    const sig = buildHubSpotSignature(rawBody, ts, 'test-secret')

    const headers = {
      'x-hubspot-signature-v3': sig,
      'x-hubspot-request-timestamp': ts,
      'x-forwarded-uri': TARGET_URI
    }

    await expect(handler(buildInboxEvent(headers), rawBody, events)).rejects.toThrow(/PG unreachable/)

    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'integrations.hubspot',
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ source: 'hubspot-companies-webhook', step: 'enqueue-async' })
      })
    )
  })

  // TASK-836 follow-up — dual-format event classification (legacy + Developer Platform 2025.2)
  // post TASK-878: assertions ahora cuentan outbox events emitidos, NO calls a syncHubSpotCompanyById.
  describe('classifyHubSpotEvent dual-format (TASK-836 follow-up)', () => {
    it('emite outbox event para company event en formato 2025.2 (object.creation + objectTypeId=0-2)', async () => {
      const handler = handlersByCode['hubspot-companies']

      const events = [
        {
          subscriptionType: 'object.creation',
          objectTypeId: '0-2',
          objectId: 27778972424
        }
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

      expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
      expect(publishOutboxEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ aggregateId: '27778972424' })
      )
    })

    it('emite outbox event para contact event 2025.2 (object.propertyChange + objectTypeId=0-1) usando associatedObjectId', async () => {
      const handler = handlersByCode['hubspot-companies']

      const events = [
        {
          subscriptionType: 'object.propertyChange',
          objectTypeId: '0-1',
          objectId: 87940966978,
          associatedObjectId: 27778972424,
          propertyName: 'lifecyclestage'
        }
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

      expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
      expect(publishOutboxEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ aggregateId: '27778972424' })
      )
    })

    it('mezcla formato legacy y 2025.2 — ambos resuelven al mismo company (dedup → 1 outbox event)', async () => {
      const handler = handlersByCode['hubspot-companies']

      const events = [
        { subscriptionType: 'company.creation', objectId: 27778972424 },                          // legacy
        { subscriptionType: 'object.propertyChange', objectTypeId: '0-2', objectId: 27778972424, propertyName: 'name' },  // 2025.2
        { subscriptionType: 'object.creation', objectType: 'company', objectId: 27778972424 }     // 2025.2 con objectType
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

      // Dedup: 3 events del mismo company → 1 outbox event
      expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)
    })

    it('ignora events con objectTypeId desconocido (NO crashea, NO emite outbox event)', async () => {
      const handler = handlersByCode['hubspot-companies']

      const events = [
        { subscriptionType: 'object.propertyChange', objectTypeId: '0-999', objectId: 12345 }
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

      expect(publishOutboxEventMock).not.toHaveBeenCalled()
    })
  })
})
