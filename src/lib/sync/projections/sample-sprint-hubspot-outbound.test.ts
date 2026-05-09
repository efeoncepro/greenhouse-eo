import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const findMock = vi.fn()
const createMock = vi.fn()

vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({
  findHubSpotGreenhouseServiceByIdempotencyKey: (...args: unknown[]) => findMock(...args),
  createHubSpotGreenhouseService: (...args: unknown[]) => createMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import { sampleSprintHubSpotOutboundProjection } from './sample-sprint-hubspot-outbound'

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  service_id: 'svc-1',
  name: 'Sample Sprint',
  hubspot_deal_id: 'deal-1',
  idempotency_key: 'svc-1',
  hubspot_sync_status: 'outbound_pending',
  hubspot_service_id: null,
  engagement_kind: 'pilot',
  organization_id: 'org-1',
  space_id: 'space-1',
  start_date: '2026-05-10',
  target_end_date: '2026-06-10',
  total_cost: '12000',
  currency: 'CLP',
  modalidad: 'sprint',
  billing_frequency: 'project',
  linea_de_servicio: 'crm_solutions',
  servicio_especifico: 'sample_sprint',
  commitment_terms_json: {
    hubspotDealContext: {
      hubspotDealId: 'deal-1',
      hubspotCompanyId: 'co-1',
      contactHubspotIds: ['ct-1', 'ct-2'],
      dealNameSnapshotAtDeclare: 'Test Deal'
    }
  },
  ...overrides
})

const scope = { entityType: 'sample_sprint_service', entityId: 'svc-1' }

describe('sampleSprintHubSpotOutboundProjection', () => {
  beforeEach(() => {
    queryMock.mockReset()
    findMock.mockReset()
    createMock.mockReset()
    captureMock.mockReset()
  })

  it('extractScope returns null for events without serviceId', () => {
    expect(sampleSprintHubSpotOutboundProjection.extractScope({})).toBeNull()
    expect(
      sampleSprintHubSpotOutboundProjection.extractScope({ serviceId: '   ' })
    ).toBeNull()
  })

  it('extractScope returns sample_sprint_service entity for valid event', () => {
    expect(
      sampleSprintHubSpotOutboundProjection.extractScope({ serviceId: 'svc-1' })
    ).toEqual({ entityType: 'sample_sprint_service', entityId: 'svc-1' })
  })

  it('returns no-op when service is missing in PG', async () => {
    queryMock.mockResolvedValueOnce([])

    const result = await sampleSprintHubSpotOutboundProjection.refresh(scope, {})

    expect(result).toContain('not found in PG')
    expect(findMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('throws when idempotency_key is missing (upstream contract violation)', async () => {
    queryMock.mockResolvedValueOnce([baseRow({ idempotency_key: null })])

    await expect(
      sampleSprintHubSpotOutboundProjection.refresh(scope, {})
    ).rejects.toThrow(/missing idempotency_key/)
    expect(captureMock).toHaveBeenCalled()
  })

  it('returns no-op when service is already ready with hubspot_service_id', async () => {
    queryMock.mockResolvedValueOnce([
      baseRow({ hubspot_sync_status: 'ready', hubspot_service_id: 'hs-existing' })
    ])

    const result = await sampleSprintHubSpotOutboundProjection.refresh(scope, {})

    expect(result).toContain('already ready')
    expect(findMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('returns no-op when service is in outbound_dead_letter (requires operator)', async () => {
    queryMock.mockResolvedValueOnce([
      baseRow({ hubspot_sync_status: 'outbound_dead_letter' })
    ])

    const result = await sampleSprintHubSpotOutboundProjection.refresh(scope, {})

    expect(result).toContain('outbound_dead_letter')
    expect(findMock).not.toHaveBeenCalled()
  })

  it('throws when commitment_terms_json lacks hubspotDealContext', async () => {
    queryMock.mockResolvedValueOnce([
      baseRow({ commitment_terms_json: { successCriteria: { foo: 'bar' } } })
    ])

    await expect(
      sampleSprintHubSpotOutboundProjection.refresh(scope, {})
    ).rejects.toThrow(/missing hubspotDealContext/)
  })

  it('idempotent-hit: skips POST when service already exists by idempotency key', async () => {
    queryMock
      .mockResolvedValueOnce([baseRow()]) // SELECT
      .mockResolvedValueOnce([]) // UPDATE outbound_in_progress
      .mockResolvedValueOnce([]) // UPDATE final ready

    findMock.mockResolvedValueOnce({
      ok: true,
      hubspotServiceId: 'hs-existing',
      properties: {}
    })

    const result = await sampleSprintHubSpotOutboundProjection.refresh(scope, {})

    expect(result).toContain('idempotent-hit')
    expect(result).toContain('hs-existing')
    expect(createMock).not.toHaveBeenCalled()
    // Final UPDATE should set hubspot_service_id + ready.
    const finalUpdateCall = queryMock.mock.calls[queryMock.mock.calls.length - 1]

    expect(finalUpdateCall[0]).toContain("hubspot_sync_status = 'ready'")
    expect(finalUpdateCall[1]).toContain('hs-existing')
  })

  it('happy path: POSTs service + associations + sets ready when all OK', async () => {
    queryMock
      .mockResolvedValueOnce([baseRow()]) // SELECT
      .mockResolvedValueOnce([]) // UPDATE in_progress
      .mockResolvedValueOnce([]) // final UPDATE ready

    findMock.mockResolvedValueOnce({ ok: true, hubspotServiceId: null, properties: null })

    createMock.mockResolvedValueOnce({
      ok: true,
      hubspotServiceId: 'hs-new-1',
      properties: {},
      associationStatus: {
        deal: 'ok',
        company: 'ok',
        contacts: [
          { contactId: 'ct-1', status: 'ok' },
          { contactId: 'ct-2', status: 'ok' }
        ]
      }
    })

    const result = await sampleSprintHubSpotOutboundProjection.refresh(scope, {})

    expect(result).toContain('ok')
    expect(result).toContain('hs-new-1')
    expect(result).toContain('status=ready')
    expect(createMock).toHaveBeenCalledWith({
      properties: expect.objectContaining({
        ef_greenhouse_service_id: 'svc-1',
        ef_engagement_kind: 'pilot',
        ef_deal_id: 'deal-1',
        hs_pipeline_stage: '1357763256'
      }),
      associations: {
        dealId: 'deal-1',
        companyId: 'co-1',
        contactIds: ['ct-1', 'ct-2']
      }
    })
  })

  it('partial path: marks partial_associations when some contact assoc fails', async () => {
    queryMock
      .mockResolvedValueOnce([baseRow()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    findMock.mockResolvedValueOnce({ ok: true, hubspotServiceId: null, properties: null })

    createMock.mockResolvedValueOnce({
      ok: true,
      hubspotServiceId: 'hs-new-2',
      properties: {},
      associationStatus: {
        deal: 'ok',
        company: 'ok',
        contacts: [
          { contactId: 'ct-1', status: 'ok' },
          { contactId: 'ct-2', status: 'failed' }
        ]
      }
    })

    const result = await sampleSprintHubSpotOutboundProjection.refresh(scope, {})

    expect(result).toContain('status=partial_associations')
    const finalUpdateCall = queryMock.mock.calls[queryMock.mock.calls.length - 1]

    expect(finalUpdateCall[1]).toContain('partial_associations')
  })

  it('throws on bridge failure + rolls state back to outbound_pending', async () => {
    queryMock
      .mockResolvedValueOnce([baseRow()])
      .mockResolvedValueOnce([]) // in_progress UPDATE
      .mockResolvedValueOnce([]) // rollback UPDATE

    findMock.mockResolvedValueOnce({ ok: true, hubspotServiceId: null, properties: null })

    createMock.mockRejectedValueOnce(new Error('HubSpot 502 upstream'))

    await expect(
      sampleSprintHubSpotOutboundProjection.refresh(scope, {})
    ).rejects.toThrow(/HubSpot 502/)

    // Rollback UPDATE should run (3rd query).
    expect(queryMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    const rollback = queryMock.mock.calls[2]

    expect(rollback[0]).toContain("'outbound_pending'")
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'integrations.hubspot',
      expect.objectContaining({
        tags: expect.objectContaining({ stage: 'bridge_create' })
      })
    )
  })

  it('throws when bridge POST returns no hubspotServiceId (unexpected contract violation)', async () => {
    queryMock
      .mockResolvedValueOnce([baseRow()])
      .mockResolvedValueOnce([])

    findMock.mockResolvedValueOnce({ ok: true, hubspotServiceId: null, properties: null })

    createMock.mockResolvedValueOnce({
      ok: true,
      hubspotServiceId: '',
      properties: {},
      associationStatus: { deal: 'ok', company: 'ok', contacts: [] }
    })

    await expect(
      sampleSprintHubSpotOutboundProjection.refresh(scope, {})
    ).rejects.toThrow(/no hubspotServiceId/)
  })

  it('declares maxRetries=3 for exponential backoff via reactive consumer', () => {
    expect(sampleSprintHubSpotOutboundProjection.maxRetries).toBe(3)
  })

  it('declares triggerEvents = service.engagement.outbound_requested', () => {
    expect(sampleSprintHubSpotOutboundProjection.triggerEvents).toContain(
      'service.engagement.outbound_requested'
    )
  })
})
