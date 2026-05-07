import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const { batchReadMock, upsertMock, queryMock, captureMock } = vi.hoisted(() => ({
  batchReadMock: vi.fn(),
  upsertMock: vi.fn(),
  queryMock: vi.fn(),
  captureMock: vi.fn()
}))

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

global.fetch = fetchMock as unknown as typeof fetch

const buildResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

vi.mock('@/lib/hubspot/list-services-for-company', () => ({
  batchReadServices: batchReadMock
}))

vi.mock('@/lib/services/upsert-service-from-hubspot', () => ({
  upsertServiceFromHubSpot: upsertMock
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: queryMock
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: captureMock
}))

vi.mock('@/lib/webhooks/signing', () => ({
  resolveSecret: async () => 'test-token'
}))

import { hubspotServicesIntakeProjection } from './hubspot-services-intake'

beforeEach(() => {
  batchReadMock.mockReset()
  upsertMock.mockReset()
  queryMock.mockReset()
  captureMock.mockReset()
  fetchMock.mockReset()
  process.env.HUBSPOT_ACCESS_TOKEN = 'test-token-env'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hubspotServicesIntakeProjection (TASK-813b)', () => {
  it('declara contract canónico: name, domain, triggerEvents, maxRetries', () => {
    expect(hubspotServicesIntakeProjection.name).toBe('hubspot_services_intake')
    expect(hubspotServicesIntakeProjection.domain).toBe('finance')
    expect(hubspotServicesIntakeProjection.triggerEvents).toEqual([
      'commercial.service_engagement.intake_requested'
    ])
    expect(hubspotServicesIntakeProjection.maxRetries).toBe(3)
  })

  it('extractScope retorna primer service_id como entityId', () => {
    expect(
      hubspotServicesIntakeProjection.extractScope({
        serviceIds: ['111', '222'],
        source: 'webhook'
      })
    ).toEqual({
      entityType: 'hubspot_services_batch',
      entityId: '111'
    })
  })

  it('extractScope retorna null cuando serviceIds vacío', () => {
    expect(
      hubspotServicesIntakeProjection.extractScope({ serviceIds: [], source: 'webhook' })
    ).toBeNull()
  })

  it('refresh: skip cuando payload no tiene serviceIds', async () => {
    const result = await hubspotServicesIntakeProjection.refresh(
      { entityType: 'hubspot_services_batch', entityId: 'noop' },
      {} as Record<string, unknown>
    )

    expect(result).toContain('skipped')
    expect(batchReadMock).not.toHaveBeenCalled()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('refresh: materializa service con space resuelto', async () => {
    batchReadMock.mockResolvedValueOnce([
      {
        id: '551519372424',
        properties: {
          hs_name: 'Sky Airline - Diseño digital',
          ef_linea_de_servicio: 'globe'
        }
      }
    ])
    fetchMock.mockResolvedValueOnce(
      buildResponse({ results: [{ toObjectId: 30825221458 }] })
    )
    queryMock.mockResolvedValueOnce([
      { space_id: 'spc-sky', client_id: 'hubspot-30825221458', organization_id: 'org-sky' }
    ])
    upsertMock.mockResolvedValueOnce({ action: 'updated', serviceId: 'SVC-HS-551519372424', syncStatus: 'synced' })

    const result = await hubspotServicesIntakeProjection.refresh(
      { entityType: 'hubspot_services_batch', entityId: '551519372424' },
      { serviceIds: ['551519372424'], source: 'webhook' }
    )

    expect(result).toContain('materialized=1/1')
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hubspotServiceId: '551519372424',
        hubspotCompanyId: '30825221458',
        source: 'hubspot_services_intake:webhook'
      })
    )
  })

  it('refresh: organization_unresolved cuando company association vacía → captureWithDomain warning', async () => {
    batchReadMock.mockResolvedValueOnce([
      { id: '111', properties: { hs_name: 'svc 111' } }
    ])
    fetchMock.mockResolvedValueOnce(buildResponse({ results: [] }))

    await expect(
      hubspotServicesIntakeProjection.refresh(
        { entityType: 'hubspot_services_batch', entityId: '111' },
        { serviceIds: ['111'], source: 'cron' }
      )
    ).rejects.toThrow(/materialized=0\/1/)

    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/^organization_unresolved:/) }),
      'integrations.hubspot',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ reason: 'no_company_association' })
      })
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('refresh: parcial — 1 ok + 1 unresolved no throws (partial success)', async () => {
    batchReadMock.mockResolvedValueOnce([
      { id: '100', properties: { hs_name: 'ok' } },
      { id: '200', properties: { hs_name: 'unresolved' } }
    ])

    fetchMock
      .mockResolvedValueOnce(buildResponse({ results: [{ toObjectId: 1 }] }))
      .mockResolvedValueOnce(buildResponse({ results: [] }))

    queryMock.mockResolvedValueOnce([{ space_id: 'spc-1', client_id: 'cli-1', organization_id: null }])

    upsertMock.mockResolvedValueOnce({ action: 'created', serviceId: 'SVC-HS-100', syncStatus: 'unmapped' })

    const result = await hubspotServicesIntakeProjection.refresh(
      { entityType: 'hubspot_services_batch', entityId: '100' },
      { serviceIds: ['100', '200'], source: 'webhook' }
    )

    expect(result).toContain('materialized=1/2')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })
})
