import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1289 — `getGrowthAiVisibilityBusinessModelSignals`: perfiles de marca enlazados con
 * business_model sin resolver. steady (0 unresolved) → ok; 1..5 → warning; >5 → error;
 * error de lectura → unknown (degradación honesta + captureWithDomain).
 */

const state = {
  rows: [{ org_linked: 0, unresolved: 0 }] as Record<string, number>[],
  throws: false
}

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => {
    if (state.throws) throw new Error('db down')

    return state.rows
  }
}))

const load = async () =>
  (await import('../growth-ai-visibility-business-model-signals')).getGrowthAiVisibilityBusinessModelSignals

beforeEach(() => {
  state.rows = [{ org_linked: 0, unresolved: 0 }]
  state.throws = false
})

describe('TASK-1289 — getGrowthAiVisibilityBusinessModelSignals', () => {
  it('steady (0 unresolved) → ok', async () => {
    const [signal] = await (await load())()

    expect(signal.severity).toBe('ok')
    expect(signal.signalId).toBe('growth.ai_visibility.profile_business_model_unresolved')
  })

  it('1..5 unresolved → warning', async () => {
    state.rows = [{ org_linked: 10, unresolved: 3 }]
    const [signal] = await (await load())()

    expect(signal.severity).toBe('warning')
  })

  it('>5 unresolved → error', async () => {
    state.rows = [{ org_linked: 20, unresolved: 9 }]
    const [signal] = await (await load())()

    expect(signal.severity).toBe('error')
  })

  it('error de lectura → unknown (degradación honesta)', async () => {
    state.throws = true
    const [signal] = await (await load())()

    expect(signal.severity).toBe('unknown')
  })
})
