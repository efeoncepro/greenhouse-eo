import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const { getHiringApplicationOutcomeDriftSignal } = await import('./hiring-application-outcome-signals')

const row = (over: Partial<Record<string, number>> = {}) => [{
  closed_without_outcome_real: 0,
  closed_without_outcome_synthetic: 0,
  outcome_not_closed: 0,
  ...over,
}]

describe('TASK-1765 — señal del invariante de cierre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sin drift el estado es `ok`: steady = 0', async () => {
    runQueryMock.mockResolvedValue(row())

    const signal = await getHiringApplicationOutcomeDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('Sin drift')
  })

  it('una fila REAL en «Cerrado» sin desenlace es `error`: congela retención de esa persona', async () => {
    runQueryMock.mockResolvedValue(row({ closed_without_outcome_real: 1 }))

    const signal = await getHiringApplicationOutcomeDriftSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('Ley 21.719')
  })

  it('las sintéticas conocidas son `warning`, no `error`: la severidad la fija el daño, no el conteo', async () => {
    // 32 sintéticas pesan MENOS que 1 real: las sintéticas son deuda asignada a TASK-1748 y no
    // congelan la retención de ninguna persona verdadera. Pintar rojo por ellas dejaría el
    // dashboard rojo permanente y le quitaría significado al rojo que sí importa.
    runQueryMock.mockResolvedValue(row({ closed_without_outcome_synthetic: 32 }))

    const signal = await getHiringApplicationOutcomeDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('TASK-1748')
  })

  it('un desenlace que no cerró es `warning`: es benigno y lo corrige el UPDATE post-release', async () => {
    runQueryMock.mockResolvedValue(row({ outcome_not_closed: 1 }))

    const signal = await getHiringApplicationOutcomeDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('etapa espejo')
  })

  it('una fila real domina la severidad aunque haya sintéticas al lado', async () => {
    runQueryMock.mockResolvedValue(row({ closed_without_outcome_real: 1, closed_without_outcome_synthetic: 32 }))

    expect((await getHiringApplicationOutcomeDriftSignal()).severity).toBe('error')
  })

  it('si la query falla degrada honesto a `unknown`, no a un 0 que mentiría', async () => {
    runQueryMock.mockRejectedValue(new Error('boom'))

    const signal = await getHiringApplicationOutcomeDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.observedAt).toBeNull()
  })

  it('no expone PII: la evidencia es sólo conteos', async () => {
    runQueryMock.mockResolvedValue(row({ closed_without_outcome_real: 2 }))

    const signal = await getHiringApplicationOutcomeDriftSignal()

    for (const item of signal.evidence.filter(e => e.kind === 'metric')) {
      expect(item.value).toMatch(/^\d+$/)
    }
  })
})
