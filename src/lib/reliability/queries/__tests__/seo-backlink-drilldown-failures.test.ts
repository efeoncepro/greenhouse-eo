import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  getSeoBacklinkDrilldownFailuresSignal,
  SEO_BACKLINK_DRILLDOWN_FAILED_SIGNAL_ID
} from '../seo-backlink-drilldown-failures'

beforeEach(() => {
  queryMock.mockReset()
})

describe('getSeoBacklinkDrilldownFailuresSignal', () => {
  it('sin evaluaciones (pre-rollout) → ok con summary explícito', async () => {
    queryMock.mockResolvedValue([{ failed: '0', drilled: '0', evaluated: '0' }])

    const signal = await getSeoBacklinkDrilldownFailuresSignal()

    expect(signal.signalId).toBe(SEO_BACKLINK_DRILLDOWN_FAILED_SIGNAL_ID)
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('pre-rollout')
  })

  it('steady (evaluados sin fallas) → ok; alguna falla → warning; todas/3+ → error', async () => {
    queryMock.mockResolvedValue([{ failed: '0', drilled: '2', evaluated: '4' }])
    expect((await getSeoBacklinkDrilldownFailuresSignal()).severity).toBe('ok')

    queryMock.mockResolvedValue([{ failed: '1', drilled: '2', evaluated: '4' }])
    expect((await getSeoBacklinkDrilldownFailuresSignal()).severity).toBe('warning')

    queryMock.mockResolvedValue([{ failed: '2', drilled: '0', evaluated: '2' }])
    expect((await getSeoBacklinkDrilldownFailuresSignal()).severity).toBe('error')
  })

  it('error de lectura → unknown; la query usa ::int (gate 893)', async () => {
    queryMock.mockRejectedValue(new Error('caída'))
    expect((await getSeoBacklinkDrilldownFailuresSignal()).severity).toBe('unknown')

    queryMock.mockReset()
    queryMock.mockResolvedValue([{ failed: '0', drilled: '0', evaluated: '0' }])
    await getSeoBacklinkDrilldownFailuresSignal()

    const [sql] = queryMock.mock.calls[0] as [string]

    expect(sql).toContain('::int')
    expect(sql).not.toContain('EXTRACT(EPOCH')
  })
})
