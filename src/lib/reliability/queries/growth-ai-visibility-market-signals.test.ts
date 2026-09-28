import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getGrowthAiVisibilityMarketSignals } from './growth-ai-visibility-market-signals'

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
const query = vi.mocked(runGreenhousePostgresQuery)

beforeEach(() => vi.resetAllMocks())
describe('market reliability signals', () => {
  it('reports unknown while migrations are absent', async () => {
    query.mockResolvedValueOnce([{ installed: false }])
    expect((await getGrowthAiVisibilityMarketSignals()).map(s => s.severity)).toEqual(['unknown', 'unknown', 'unknown'])
    expect(query).toHaveBeenCalledTimes(1)
  })
  it('reports clean configurations without warnings', async () => {
    query
      .mockResolvedValueOnce([{ installed: true }])
      .mockResolvedValueOnce([{ market: 'MX', locale: 'es-MX', primary_count: 1 }])
      .mockResolvedValueOnce([{ defaults: 0, partial: 0 }])
    expect((await getGrowthAiVisibilityMarketSignals()).map(s => s.severity)).toEqual(['ok', 'ok', 'ok'])
  })
  it('exposes missing primary, unresolved country and partial batches', async () => {
    query
      .mockResolvedValueOnce([{ installed: true }])
      .mockResolvedValueOnce([{ market: 'invalid', locale: 'es-MX', primary_count: 0 }])
      .mockResolvedValueOnce([{ defaults: 2, partial: 1 }])
    const signals = await getGrowthAiVisibilityMarketSignals()

    expect(signals.map(s => s.severity)).toEqual(['warning', 'warning', 'warning'])
    expect(signals[1].evidence).toEqual([{ kind: 'metric', label: 'count', value: '3' }])
  })
  it('reports unknown after query failure without returning raw errors', async () => {
    query.mockRejectedValueOnce(new Error('private database detail'))
    const signals = await getGrowthAiVisibilityMarketSignals()

    expect(signals.every(s => s.severity === 'unknown')).toBe(true)
    expect(JSON.stringify(signals)).not.toContain('private database detail')
  })
})
