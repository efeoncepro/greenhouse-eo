import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

import { getNotionMetricsFtrWritebackLagSignal } from './notion-metrics-ftr-signals'

const originalGlobalFlag = process.env.NOTION_FTR_WRITEBACK_ENABLED
const originalEfeonceFlag = process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE
const originalSkyFlag = process.env.NOTION_FTR_WRITEBACK_ENABLED_SKY

beforeEach(() => {
  mocks.query.mockReset()
  mocks.captureWithDomain.mockReset()
  delete process.env.NOTION_FTR_WRITEBACK_ENABLED
  delete process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE
  delete process.env.NOTION_FTR_WRITEBACK_ENABLED_SKY
})

afterEach(() => {
  if (originalGlobalFlag === undefined) delete process.env.NOTION_FTR_WRITEBACK_ENABLED
  else process.env.NOTION_FTR_WRITEBACK_ENABLED = originalGlobalFlag

  if (originalEfeonceFlag === undefined) delete process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE
  else process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE = originalEfeonceFlag

  if (originalSkyFlag === undefined) delete process.env.NOTION_FTR_WRITEBACK_ENABLED_SKY
  else process.env.NOTION_FTR_WRITEBACK_ENABLED_SKY = originalSkyFlag
})

describe('getNotionMetricsFtrWritebackLagSignal', () => {
  it('reports pending FTR snapshots as dormant backlog when writeback flag is disabled', async () => {
    mocks.query.mockResolvedValueOnce([{ count: '63', oldest_age_minutes: '4200.2' }])

    const signal = await getNotionMetricsFtrWritebackLagSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('deshabilitado por flag')
    expect(signal.evidence).toContainEqual(
      expect.objectContaining({
        kind: 'metric',
        label: 'lag_count_if_enabled',
        value: '63'
      })
    )
  })

  it('keeps lag severity active when the global writeback flag is enabled', async () => {
    process.env.NOTION_FTR_WRITEBACK_ENABLED = 'true'
    mocks.query.mockResolvedValueOnce([{ count: '4', oldest_age_minutes: '91.7' }])

    const signal = await getNotionMetricsFtrWritebackLagSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('4 snapshots FTR pending writeback')
  })

  it('keeps lag severity active when a per-client writeback flag is enabled', async () => {
    process.env.NOTION_FTR_WRITEBACK_ENABLED_EFEONCE = 'true'
    mocks.query.mockResolvedValueOnce([{ count: '2', oldest_age_minutes: '70.1' }])

    const signal = await getNotionMetricsFtrWritebackLagSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('2 snapshots FTR pending writeback')
  })
})
