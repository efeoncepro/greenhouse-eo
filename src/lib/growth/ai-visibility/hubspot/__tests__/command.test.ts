import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncAiVisibilityRunToHubSpot } from '../command'
import { GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT } from '../events'
import { getGraderLeadForHandoff, type GraderLeadForHandoff } from '../../public-intake/store'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

vi.mock('../../public-intake/store', () => ({ getGraderLeadForHandoff: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn().mockResolvedValue('outbox-x') }))

const lead = (overrides: Partial<GraderLeadForHandoff> = {}): GraderLeadForHandoff => ({
  leadId: 'glead-1',
  email: 'ana@acme.com',
  consent: true,
  firstName: 'Ana',
  lastName: 'Pérez',
  brandName: 'Acme',
  websiteUrl: null,
  consentAt: '2026-06-25T10:00:00.000Z',
  hubspotSyncedAt: null,
  ...overrides,
})

describe('syncAiVisibilityRunToHubSpot (enqueue gobernado)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('publica el evento cuando hay lead con consent y no sincronizado', async () => {
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(lead())

    const result = await syncAiVisibilityRunToHubSpot({ runId: 'run-1', trigger: 'report_published' })

    expect(result.status).toBe('requested')
    expect(publishOutboxEvent).toHaveBeenCalledOnce()
    expect(vi.mocked(publishOutboxEvent).mock.calls[0][0]).toMatchObject({
      eventType: GROWTH_AI_VISIBILITY_LEAD_HANDOFF_REQUESTED_EVENT,
      aggregateId: 'run-1',
      payload: { schemaVersion: 1, runId: 'run-1', trigger: 'report_published' },
    })
  })

  it('skip sin publicar cuando no hay lead', async () => {
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(null)
    const result = await syncAiVisibilityRunToHubSpot({ runId: 'run-x', trigger: 'report_published' })

    expect(result).toMatchObject({ status: 'skipped', reason: 'no_lead' })
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('skip sin publicar cuando el lead no tiene consent', async () => {
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(lead({ consent: false }))
    const result = await syncAiVisibilityRunToHubSpot({ runId: 'run-1', trigger: 'report_published' })

    expect(result).toMatchObject({ status: 'skipped', reason: 'no_consent' })
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('skip cuando ya está sincronizado (auto-trigger idempotente)', async () => {
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(lead({ hubspotSyncedAt: '2026-06-25T11:00:00.000Z' }))
    const result = await syncAiVisibilityRunToHubSpot({ runId: 'run-1', trigger: 'report_published' })

    expect(result).toMatchObject({ status: 'skipped', reason: 'already_synced' })
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('admin_retrigger ignora el guard de already_synced (re-sync deliberado)', async () => {
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(lead({ hubspotSyncedAt: '2026-06-25T11:00:00.000Z' }))
    const result = await syncAiVisibilityRunToHubSpot({ runId: 'run-1', trigger: 'admin_retrigger' })

    expect(result.status).toBe('requested')
    expect(publishOutboxEvent).toHaveBeenCalledOnce()
  })
})
