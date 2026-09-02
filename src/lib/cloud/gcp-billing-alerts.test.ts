import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GcpBillingOverview, GcpCostDriver } from '@/types/billing-export'

const mocks = vi.hoisted(() => ({
  getOverview: vi.fn(),
  hasRecent: vi.fn(),
  record: vi.fn(),
  postTeams: vi.fn(),
  sendSlack: vi.fn()
}))

vi.mock('@/lib/cloud/gcp-billing', () => ({ getGcpBillingOverview: mocks.getOverview }))
vi.mock('@/lib/integrations/teams/sender', () => ({ postTeamsCard: mocks.postTeams }))
vi.mock('@/lib/alerts/slack-notify', () => ({ sendSlackAlert: mocks.sendSlack }))
vi.mock('./finops-ai/persist', () => ({
  hasRecentCloudCostAlertDispatch: mocks.hasRecent,
  recordCloudCostAlertDispatch: mocks.record,
  stableFingerprint: (value: unknown) => JSON.stringify(value)
}))

import { runCloudCostAlertSweep } from './gcp-billing-alerts'

const driver = (currentCost: number): GcpCostDriver => ({
  driverId: 'share_of_total.cloud_run',
  kind: 'share_of_total',
  severity: 'warning',
  serviceDescription: 'Cloud Run',
  resourceName: null,
  summary: 'Cloud Run concentra el gasto.',
  currentCost,
  baselineCost: 200_000,
  deltaPercent: 120,
  share: 55,
  threshold: '>=50%',
  evidence: []
})

const overview = (currentCost: number) =>
  ({
    availability: 'configured',
    topDrivers: [driver(currentCost)]
  }) as GcpBillingOverview

describe('runCloudCostAlertSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOverview.mockResolvedValue(overview(100_000))
    mocks.hasRecent.mockResolvedValue(false)
    mocks.postTeams.mockResolvedValue({ ok: true })
  })

  it('evaluates a synthetic dry run without DB writes or real notifications', async () => {
    const result = await runCloudCostAlertSweep({ dryRun: true })

    expect(result.alertsEligible).toBe(1)
    expect(result.alertsDispatched).toBe(0)
    expect(result.skippedReason).toContain('dryRun=true')
    expect(mocks.hasRecent).not.toHaveBeenCalled()
    expect(mocks.record).not.toHaveBeenCalled()
    expect(mocks.postTeams).not.toHaveBeenCalled()
    expect(mocks.sendSlack).not.toHaveBeenCalled()
  })

  it('deduplicates the same incident when only its mutable cost changes', async () => {
    await runCloudCostAlertSweep()

    const firstFingerprint = mocks.record.mock.calls[0]?.[0]?.fingerprint

    mocks.getOverview.mockResolvedValue(overview(140_000))
    mocks.hasRecent.mockImplementation(async fingerprint => fingerprint === firstFingerprint)

    const second = await runCloudCostAlertSweep()

    expect(second.skippedReason).toBe('Fingerprint ya despachado dentro del cooldown')
    expect(mocks.postTeams).toHaveBeenCalledTimes(1)
    expect(mocks.record).toHaveBeenCalledTimes(1)
  })
})
