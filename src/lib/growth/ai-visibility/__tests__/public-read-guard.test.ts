import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1245 Slice 3 — `checkPublicReadAllowed(ip, kind)`: rate-limit proporcional de reads
 * públicos. Cubre under/over límite, sin IP, no-registro en el path bloqueado y fail-open.
 */

const state = { count: 0, throws: false }
const spies = { record: vi.fn() }

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async () => {
    if (state.throws) throw new Error('db down')

    return [{ n: state.count }]
  },
}))

vi.mock('../public-intake/abuse-guard', () => ({
  hashIdentifier: (v: string | null) => (v ? `hash:${v}` : null),
  recordIntakeEvent: async (input: unknown) => {
    spies.record(input)
  },
}))

const load = async () => (await import('../public-delivery/read-guard')).checkPublicReadAllowed

beforeEach(() => {
  state.count = 0
  state.throws = false
  spies.record.mockClear()
  delete process.env.GROWTH_AI_VISIBILITY_PUBLIC_READ_PER_IP_PER_MIN
})

describe('TASK-1245 — checkPublicReadAllowed', () => {
  it('bajo el límite → permite y registra el read con el outcome namespaced', async () => {
    state.count = 10
    expect(await (await load())('1.2.3.4', 'status')).toBe(true)
    expect(spies.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'read_status', estimatedCostUsd: null }))
  })

  it('en/sobre el límite → bloquea y NO registra (no infla el contador)', async () => {
    state.count = 60 // default limit
    expect(await (await load())('1.2.3.4', 'report')).toBe(false)
    expect(spies.record).not.toHaveBeenCalled()
  })

  it('sin IP resoluble → permite sin contar (el handle no enumerable protege)', async () => {
    expect(await (await load())(null, 'status')).toBe(true)
    expect(spies.record).not.toHaveBeenCalled()
  })

  it('fail-open: error de DB → permite (no rompe al usuario legítimo)', async () => {
    state.throws = true
    expect(await (await load())('1.2.3.4', 'status')).toBe(true)
  })

  it('respeta el límite configurable por env', async () => {
    process.env.GROWTH_AI_VISIBILITY_PUBLIC_READ_PER_IP_PER_MIN = '5'
    state.count = 5
    expect(await (await load())('1.2.3.4', 'status')).toBe(false)
  })
})
