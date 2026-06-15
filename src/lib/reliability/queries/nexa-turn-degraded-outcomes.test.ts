import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const { getNexaTurnDegradedOutcomesSignal } = await import('./nexa-turn-degraded-outcomes')

describe('getNexaTurnDegradedOutcomesSignal (TASK-1129)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sin tráfico (total=0) → unknown', async () => {
    mockQuery.mockResolvedValue([{ total_turns: '0', graceful_fallback_count: '0', failover_count: '0' }])

    const signal = await getNexaTurnDegradedOutcomesSignal()

    expect(signal.moduleKey).toBe('home')
    expect(signal.severity).toBe('unknown')
  })

  it('turnos limpios (degraded=0) → ok', async () => {
    mockQuery.mockResolvedValue([{ total_turns: '40', graceful_fallback_count: '0', failover_count: '0' }])

    const signal = await getNexaTurnDegradedOutcomesSignal()

    expect(signal.severity).toBe('ok')
  })

  it('1-9 degradados → warning', async () => {
    mockQuery.mockResolvedValue([{ total_turns: '40', graceful_fallback_count: '2', failover_count: '1' }])

    const signal = await getNexaTurnDegradedOutcomesSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('graceful_fallback=2')
    expect(signal.summary).toContain('failover=1')
  })

  it('>=10 degradados → error', async () => {
    mockQuery.mockResolvedValue([{ total_turns: '40', graceful_fallback_count: '10', failover_count: '0' }])

    const signal = await getNexaTurnDegradedOutcomesSignal()

    expect(signal.severity).toBe('error')
  })

  it('fallo de query → unknown (degradación honesta)', async () => {
    mockQuery.mockRejectedValue(new Error('relation does not exist'))

    const signal = await getNexaTurnDegradedOutcomesSignal()

    expect(signal.severity).toBe('unknown')
  })
})
