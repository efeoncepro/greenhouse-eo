import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1245 Slice 3 — `getGrowthAiVisibilityPublicDeliverySignals`: 3 signals de entrega pública.
 * steady (0/0/0) → ok; pending/inconsistent >0 → warning/error; error de lectura → unknown.
 */

const state = {
  rows: [{ reads_24h: 0, delivery_pending: 0, delivery_inconsistent: 0 }] as Record<string, number>[],
  throws: false,
}

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => {
    if (state.throws) throw new Error('db down')

    return state.rows
  },
}))

const load = async () =>
  (await import('../growth-ai-visibility-public-delivery-signals')).getGrowthAiVisibilityPublicDeliverySignals

const byId = (signals: Awaited<ReturnType<Awaited<ReturnType<typeof load>>>>, idFragment: string) =>
  signals.find(s => s.signalId.includes(idFragment))!

beforeEach(() => {
  state.rows = [{ reads_24h: 0, delivery_pending: 0, delivery_inconsistent: 0 }]
  state.throws = false
})

describe('TASK-1245 — getGrowthAiVisibilityPublicDeliverySignals', () => {
  it('steady (0/0/0) → 3 signals, todas ok', async () => {
    const signals = await (await load())()

    expect(signals).toHaveLength(3)
    expect(signals.every(s => s.severity === 'ok')).toBe(true)
  })

  it('delivery_pending 1-3 → warning; >3 → error', async () => {
    state.rows = [{ reads_24h: 5, delivery_pending: 2, delivery_inconsistent: 0 }]
    expect(byId(await (await load())(), 'public_delivery_pending').severity).toBe('warning')

    state.rows = [{ reads_24h: 5, delivery_pending: 9, delivery_inconsistent: 0 }]
    expect(byId(await (await load())(), 'public_delivery_pending').severity).toBe('error')
  })

  it('delivery_inconsistent >0 → warning/error (invariante ready⟹snapshot)', async () => {
    state.rows = [{ reads_24h: 0, delivery_pending: 0, delivery_inconsistent: 1 }]
    expect(byId(await (await load())(), 'public_delivery_inconsistent').severity).toBe('warning')
  })

  it('read volume se refleja en el summary del status_read', async () => {
    state.rows = [{ reads_24h: 42, delivery_pending: 0, delivery_inconsistent: 0 }]
    expect(byId(await (await load())(), 'public_status_read').summary).toContain('42')
  })

  it('error de lectura → degradación honesta (severity unknown)', async () => {
    state.throws = true
    const signals = await (await load())()

    expect(signals[0].severity).toBe('unknown')
  })
})
