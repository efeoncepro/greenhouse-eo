import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()
const captureMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

import { getEngagementBudgetOverrunSignal } from './engagement-budget-overrun'
import { getEngagementConversionRateDropSignal } from './engagement-conversion-rate-drop'
import { getEngagementOverdueDecisionSignal } from './engagement-overdue-decision'
import { getEngagementUnapprovedActiveSignal } from './engagement-unapproved-active'
import { getEngagementZombieSignal } from './engagement-zombie'

describe('Commercial Health reliability readers', () => {
  beforeEach(() => {
    queryMock.mockReset()
    captureMock.mockReset()
    delete process.env.GREENHOUSE_COMMERCIAL_ENGAGEMENT_CONVERSION_RATE_THRESHOLD
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok for steady count-based signals', async () => {
    queryMock.mockResolvedValue([{ n: 0 }])

    await expect(getEngagementOverdueDecisionSignal()).resolves.toMatchObject({
      signalId: 'commercial.engagement.overdue_decision',
      moduleKey: 'commercial',
      kind: 'drift',
      severity: 'ok'
    })
    await expect(getEngagementBudgetOverrunSignal()).resolves.toMatchObject({
      signalId: 'commercial.engagement.budget_overrun',
      severity: 'ok'
    })
    await expect(getEngagementZombieSignal()).resolves.toMatchObject({
      signalId: 'commercial.engagement.zombie',
      severity: 'ok'
    })
    await expect(getEngagementUnapprovedActiveSignal()).resolves.toMatchObject({
      signalId: 'commercial.engagement.unapproved_active',
      severity: 'ok'
    })
  })

  it('uses the expected severity per non-steady count-based signal', async () => {
    queryMock.mockResolvedValue([{ n: 2 }])

    await expect(getEngagementOverdueDecisionSignal()).resolves.toMatchObject({ severity: 'error' })
    await expect(getEngagementBudgetOverrunSignal()).resolves.toMatchObject({ severity: 'warning' })
    await expect(getEngagementZombieSignal()).resolves.toMatchObject({ severity: 'error' })
    await expect(getEngagementUnapprovedActiveSignal()).resolves.toMatchObject({ severity: 'error' })
  })

  it('queries canonical engagement tables and serving cost attribution', async () => {
    queryMock.mockResolvedValue([{ n: 0 }])

    await getEngagementOverdueDecisionSignal()
    await getEngagementBudgetOverrunSignal()
    await getEngagementZombieSignal()
    await getEngagementUnapprovedActiveSignal()

    const sql = queryMock.mock.calls.map(call => String(call[0])).join('\n---\n')

    expect(sql).toContain('greenhouse_core.services s')
    expect(sql).toContain('greenhouse_commercial.engagement_phases p')
    expect(sql).toContain('greenhouse_commercial.engagement_outcomes o')
    expect(sql).toContain('greenhouse_commercial.engagement_lineage l')
    expect(sql).toContain('greenhouse_commercial.engagement_approvals a')
    expect(sql).toContain('greenhouse_serving.commercial_cost_attribution_v2')
    expect(sql).toContain("s.hubspot_sync_status IS DISTINCT FROM 'unmapped'")
    expect(sql).toContain("s.status != 'legacy_seed_archived'")
  })

  it('returns warning when conversion rate is below threshold', async () => {
    queryMock.mockResolvedValueOnce([{ total_outcomes: 10, converted_outcomes: 2 }])

    const signal = await getEngagementConversionRateDropSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.evidence.find(e => e.label === 'threshold')?.value).toBe('0.3')
    expect(signal.evidence.find(e => e.label === 'conversion_rate')?.value).toBe('0.2')
  })

  it('supports percentage env override for conversion threshold', async () => {
    process.env.GREENHOUSE_COMMERCIAL_ENGAGEMENT_CONVERSION_RATE_THRESHOLD = '25'
    queryMock.mockResolvedValueOnce([{ total_outcomes: 10, converted_outcomes: 3 }])

    const signal = await getEngagementConversionRateDropSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.evidence.find(e => e.label === 'threshold')?.value).toBe('0.25')
  })

  it('does not warn when there are no terminal outcomes yet', async () => {
    queryMock.mockResolvedValueOnce([{ total_outcomes: 0, converted_outcomes: 0 }])

    const signal = await getEngagementConversionRateDropSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('Sin outcomes terminales')
  })

  it('degrades to unknown and captures errors', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getEngagementZombieSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.evidence.find(e => e.label === 'error')?.value).toContain('connection refused')
    expect(captureMock).toHaveBeenCalledWith(
      expect.any(Error),
      'commercial',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'reliability_signal_engagement_zombie' })
      })
    )
  })
})
