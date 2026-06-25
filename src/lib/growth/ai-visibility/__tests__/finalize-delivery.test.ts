import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1245 Slice 2 — `finalizeRunDelivery(run)`: write-side del delivery público. Materializa
 * `public_delivery_state` + publica el snapshot idempotente SÓLO para gates publicables.
 * Cubre el mapa gate→state, el gate de review_required (NUNCA auto-publica), no-op no-terminal,
 * y el best-effort (un fallo de publish no rompe la finalización del run).
 */

const state = {
  gate: 'ready' as string,
  reportThrows: null as Error | null,
  publishThrows: null as Error | null,
}

const spies = {
  setState: vi.fn(),
  publish: vi.fn(),
  readReport: vi.fn(),
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (_sql: string, params: unknown[]) => {
    spies.setState(params)

    return []
  },
}))

vi.mock('../report/command', async () => {
  class GraderReportError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }

  return {
    GraderReportError,
    readGraderReport: async () => {
      spies.readReport()
      if (state.reportThrows) throw state.reportThrows

      return { report: { gate: { status: state.gate } } }
    },
  }
})

vi.mock('../report/snapshot', () => ({
  publishGraderReportSnapshot: async (input: unknown) => {
    spies.publish(input)
    if (state.publishThrows) throw state.publishThrows

    return { reportId: 'grpt-1', reportToken: 'grt-1' }
  },
}))

const run = (status: string) => ({ runId: 'grun-1', status }) as never

const load = async () => (await import('../public-delivery/finalize-delivery')).finalizeRunDelivery

beforeEach(() => {
  state.gate = 'ready'
  state.reportThrows = null
  state.publishThrows = null
  spies.setState.mockClear()
  spies.publish.mockClear()
  spies.readReport.mockClear()
})

describe('TASK-1245 — finalizeRunDelivery', () => {
  it('gate ready → publica snapshot + ready', async () => {
    state.gate = 'ready'
    expect(await (await load())(run('succeeded'))).toBe('ready')
    expect(spies.publish).toHaveBeenCalledTimes(1)
    expect(spies.setState).toHaveBeenCalledWith(['grun-1', 'ready'])
  })

  it('gate partial → publica snapshot + ready', async () => {
    state.gate = 'partial'
    expect(await (await load())(run('partial'))).toBe('ready')
    expect(spies.publish).toHaveBeenCalledTimes(1)
  })

  it('gate review_required → in_review, NUNCA publica', async () => {
    state.gate = 'review_required'
    expect(await (await load())(run('succeeded'))).toBe('in_review')
    expect(spies.publish).not.toHaveBeenCalled()
    expect(spies.setState).toHaveBeenCalledWith(['grun-1', 'in_review'])
  })

  it('gate insufficient_data → unavailable, NUNCA publica', async () => {
    state.gate = 'insufficient_data'
    expect(await (await load())(run('partial'))).toBe('unavailable')
    expect(spies.publish).not.toHaveBeenCalled()
  })

  it('failed/skipped → unavailable sin leer reporte ni publicar', async () => {
    const finalize = await load()

    expect(await finalize(run('failed'))).toBe('unavailable')
    expect(await finalize(run('skipped'))).toBe('unavailable')
    expect(spies.readReport).not.toHaveBeenCalled()
    expect(spies.publish).not.toHaveBeenCalled()
  })

  it('sin score derivable (GraderReportError) → unavailable, sin publicar', async () => {
    const { GraderReportError } = await import('../report/command')

    state.reportThrows = new GraderReportError('score_not_found', 'x')
    expect(await (await load())(run('succeeded'))).toBe('unavailable')
    expect(spies.publish).not.toHaveBeenCalled()
  })

  it('run no terminal (running) → no-op (null), no toca delivery', async () => {
    expect(await (await load())(run('running'))).toBeNull()
    expect(spies.setState).not.toHaveBeenCalled()
  })

  it('best-effort: si publish falla, devuelve null y NO rompe (run ya finalizado)', async () => {
    state.publishThrows = new Error('bq down')
    expect(await (await load())(run('succeeded'))).toBeNull()
  })
})
