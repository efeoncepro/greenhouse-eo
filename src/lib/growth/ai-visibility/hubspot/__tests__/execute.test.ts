import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeLeadHandoff } from '../execute'
import { isLeadHandoffEnabled } from '../../flags'
import { getGraderLeadForHandoff, markGraderLeadHubspotSynced, type GraderLeadForHandoff } from '../../public-intake/store'
import { GraderReportError, readGraderReport } from '../../report/command'
import { upsertLeadToHubSpot } from '../crm-client'

import type * as ReportCommandModule from '../../report/command'

vi.mock('../../flags', () => ({ isLeadHandoffEnabled: vi.fn() }))
vi.mock('../../public-intake/store', () => ({
  getGraderLeadForHandoff: vi.fn(),
  markGraderLeadHubspotSynced: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../report/command', async () => {
  const actual = await vi.importActual<typeof ReportCommandModule>('../../report/command')

  return { ...actual, readGraderReport: vi.fn() }
})
vi.mock('../report-link', () => ({
  getLatestReportTokenForRun: vi.fn().mockResolvedValue('tok-123'),
  buildPublicReportUrl: (token: string) => `https://think.efeoncepro.com/brand-visibility/r/${token}`,
}))
vi.mock('../crm-client', () => ({ upsertLeadToHubSpot: vi.fn() }))

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

const readyReport = () => ({
  report: {
    overallScore: 47,
    scoreVersion: 'ai_visibility_score_v1',
    gate: { status: 'ready' },
    primaryGap: { gapKey: 'entity_clarity' },
    recommendedMotion: 'entity_foundation',
    competitiveSov: { competitors: [{ name: 'Globex' }] },
    provenance: { asOfDate: '2026-06-25T09:00:00.000Z' },
  },
})

describe('executeLeadHandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isLeadHandoffEnabled).mockReturnValue(true)
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(lead())
    vi.mocked(readGraderReport).mockResolvedValue(readyReport() as never)
  })

  it('flag OFF ⇒ skipped sin tocar HubSpot', async () => {
    vi.mocked(isLeadHandoffEnabled).mockReturnValue(false)
    const result = await executeLeadHandoff('run-1')

    expect(result).toMatchObject({ status: 'skipped', reason: 'disabled' })
    expect(upsertLeadToHubSpot).not.toHaveBeenCalled()
  })

  it('sin lead ⇒ skipped', async () => {
    vi.mocked(getGraderLeadForHandoff).mockResolvedValue(null)
    expect((await executeLeadHandoff('run-1')).reason).toBe('no_lead')
  })

  it('score gateado (insufficient_data/review_required) ⇒ skipped not_releasable (sin score falso)', async () => {
    for (const status of ['review_required', 'insufficient_data']) {
      vi.clearAllMocks()
      vi.mocked(isLeadHandoffEnabled).mockReturnValue(true)
      vi.mocked(getGraderLeadForHandoff).mockResolvedValue(lead())
      vi.mocked(readGraderReport).mockResolvedValue({ report: { ...readyReport().report, gate: { status } } } as never)

      const result = await executeLeadHandoff('run-1')

      expect(result, status).toMatchObject({ status: 'skipped', reason: 'not_releasable' })
      expect(upsertLeadToHubSpot, status).not.toHaveBeenCalled()
    }
  })

  it('gate `partial` SÍ es releasable (mismo predicado que el snapshot; bug del smoke)', async () => {
    vi.mocked(readGraderReport).mockResolvedValue({ report: { ...readyReport().report, gate: { status: 'partial' } } } as never)
    vi.mocked(upsertLeadToHubSpot).mockResolvedValue({ status: 'succeeded', contactId: 'c1', companyId: 'co1', retryable: false })

    const result = await executeLeadHandoff('run-1')

    expect(result.status).toBe('succeeded')
    expect(upsertLeadToHubSpot).toHaveBeenCalledOnce()
  })

  it('score not found ⇒ skipped no_score (no dead-letter)', async () => {
    vi.mocked(readGraderReport).mockRejectedValue(new GraderReportError('score_not_found', 'x'))
    expect((await executeLeadHandoff('run-1')).reason).toBe('no_score')
  })

  it('happy path ⇒ upsert + marca synced', async () => {
    vi.mocked(upsertLeadToHubSpot).mockResolvedValue({ status: 'succeeded', contactId: 'c1', companyId: 'co1', retryable: false })
    const result = await executeLeadHandoff('run-1')

    expect(result).toMatchObject({ status: 'succeeded', contactId: 'c1', companyId: 'co1' })
    expect(markGraderLeadHubspotSynced).toHaveBeenCalledWith('glead-1')
    // TASK-1257 — el nombre/apellido reales del lead llegan al payload del handoff (firstname/lastname nativos).
    const payload = vi.mocked(upsertLeadToHubSpot).mock.calls[0][0]

    expect(payload.contact.firstName).toBe('Ana')
    expect(payload.contact.lastName).toBe('Pérez')
  })

  it('fallo retryable del upsert ⇒ failed retryable, NO marca synced', async () => {
    vi.mocked(upsertLeadToHubSpot).mockResolvedValue({ status: 'failed', errorClass: 'rate_limited', retryable: true })
    const result = await executeLeadHandoff('run-1')

    expect(result).toMatchObject({ status: 'failed', retryable: true })
    expect(markGraderLeadHubspotSynced).not.toHaveBeenCalled()
  })
})
