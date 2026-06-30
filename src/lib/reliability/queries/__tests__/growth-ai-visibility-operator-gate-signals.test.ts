import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1291 — `getGrowthAiVisibilityOperatorGateSignals`: prospectos no graduables que el gate del
 * cross-sell bloquearía. Flag OFF → ok (pre-launch). Flag ON: 0 → ok; 1..5 → warning; >5 → error;
 * error de lectura → unknown (degradación honesta + captureWithDomain).
 */

const state = {
  rows: [{ org_linked: 0, prospect_ungradeable: 0 }] as Record<string, number>[],
  flagEnabled: true,
  throws: false
}

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/growth/ai-visibility/flags', () => ({ isOperatorSendEnabled: () => state.flagEnabled }))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => {
    if (state.throws) throw new Error('db down')

    return state.rows
  }
}))

const load = async () =>
  (await import('../growth-ai-visibility-operator-gate-signals')).getGrowthAiVisibilityOperatorGateSignals

beforeEach(() => {
  state.rows = [{ org_linked: 0, prospect_ungradeable: 0 }]
  state.flagEnabled = true
  state.throws = false
})

describe('TASK-1291 — getGrowthAiVisibilityOperatorGateSignals', () => {
  it('flag OFF → ok aunque haya prospectos no graduables (pre-launch)', async () => {
    state.flagEnabled = false
    state.rows = [{ org_linked: 10, prospect_ungradeable: 9 }]
    const [signal] = await (await load())()

    expect(signal.severity).toBe('ok')
    expect(signal.signalId).toBe('growth.ai_visibility.operator_gate_blocking')
  })

  it('flag ON, 0 no graduables → ok', async () => {
    const [signal] = await (await load())()

    expect(signal.severity).toBe('ok')
  })

  it('flag ON, 1..5 → warning', async () => {
    state.rows = [{ org_linked: 10, prospect_ungradeable: 3 }]
    const [signal] = await (await load())()

    expect(signal.severity).toBe('warning')
  })

  it('flag ON, >5 → error', async () => {
    state.rows = [{ org_linked: 20, prospect_ungradeable: 9 }]
    const [signal] = await (await load())()

    expect(signal.severity).toBe('error')
  })

  it('error de lectura → unknown (degradación honesta)', async () => {
    state.throws = true
    const [signal] = await (await load())()

    expect(signal.severity).toBe('unknown')
  })
})
