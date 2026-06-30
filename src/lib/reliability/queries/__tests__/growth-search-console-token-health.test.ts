import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const db = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/db', () => ({ query: db.query }))

import {
  getGrowthSearchConsoleTokenHealthSignal,
  GROWTH_SEARCH_CONSOLE_TOKEN_UNHEALTHY_SIGNAL_ID
} from '../growth-search-console-token-health'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getGrowthSearchConsoleTokenHealthSignal', () => {
  it('steady=0: severity ok cuando no hay conexiones no-sanas', async () => {
    db.query.mockResolvedValue([{ unhealthy: 0, active: 2, total: 2 }])
    const signal = await getGrowthSearchConsoleTokenHealthSignal()

    expect(signal.signalId).toBe(GROWTH_SEARCH_CONSOLE_TOKEN_UNHEALTHY_SIGNAL_ID)
    expect(signal.moduleKey).toBe('growth')
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('ok')
  })

  it('warning cuando hay conexiones revocadas/expiradas', async () => {
    db.query.mockResolvedValue([{ unhealthy: 1, active: 1, total: 2 }])
    const signal = await getGrowthSearchConsoleTokenHealthSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('reconectar')
  })

  it('unknown + capture cuando la query falla', async () => {
    db.query.mockRejectedValue(new Error('boom'))
    const signal = await getGrowthSearchConsoleTokenHealthSignal()

    expect(signal.severity).toBe('unknown')
  })
})
