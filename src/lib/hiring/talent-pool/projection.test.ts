import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeProcessPredicate } from '../active-process'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  publish: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mocks.query }) => unknown) =>
    callback({ query: mocks.query })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mocks.publish(...args)
}))

import { reconcileTalentPoolProjection } from './projection'

describe('reconcileTalentPoolProjection privacy boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query
      .mockResolvedValueOnce({
        rows: [{ total_facets: 52, active_process: 50, needs_reconsent: 2 }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [], rowCount: 10 })
      .mockResolvedValueOnce({ rows: [], rowCount: 20 })
      .mockResolvedValueOnce({ rows: [], rowCount: 30 })
    mocks.publish.mockResolvedValue(undefined)
  })

  it('keeps active applications separate from future consent and rebuilds discoverable evidence exactly', async () => {
    const result = await reconcileTalentPoolProjection({ apply: true, actorUserId: 'privacy-test' })
    const statements = mocks.query.mock.calls.map(call => String(call[0]))

    expect(statements.some(sql => sql.includes("purpose='future_opportunities'"))).toBe(true)
    // TASK-1772 — el SQL emitido pregunta por los TRES ejes, no por la lista de etapas. Se asserta
    // el predicado CANÓNICO (no un literal reescrito): si alguien vuelve a preguntar por etapa, o
    // pierde `archived_at` por el camino, este test cae.
    expect(statements.some(sql => sql.includes(activeProcessPredicate('a')))).toBe(true)
    // El literal se arma por partes: escribirlo entero acá haría que el gate de source del
    // Slice 4 se encontrara a sí mismo y reportara un falso positivo eterno sobre su guardián.
    expect(statements.some(sql => sql.includes(`stage NOT ${'IN'} (`))).toBe(false)
    expect(
      statements.some(
        sql =>
          sql.includes('DELETE FROM greenhouse_hiring.talent_pool_evidence_projection') &&
          sql.includes('WHERE e.membership_id=m.membership_id')
      )
    ).toBe(true)
    expect(
      statements.filter(sql => sql.includes('talent_pool_evidence_projection')).filter(sql => sql.includes('INSERT INTO'))
    ).toHaveLength(3)
    expect(
      statements
        .filter(sql => sql.includes('INSERT INTO greenhouse_hiring.talent_pool_evidence_projection'))
        .every(sql => sql.includes("m.lifecycle_status IN ('active_process','pool_eligible','paused')"))
    ).toBe(true)
    expect(result).toMatchObject({
      membershipsReclassified: 0,
      evidenceRemoved: 2,
      evidenceUpserted: 60
    })
  })
})

describe('TASK-1748 — la projection no materializa personas sinteticas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 })
    mocks.publish.mockResolvedValue(undefined)
  })

  const statementsWithFlag = async (flag: string) => {
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', flag)
    await reconcileTalentPoolProjection({ apply: true, actorUserId: 'task-1748-test' })

    return mocks.query.mock.calls.map(call => String(call[0]))
  }

  it('el predicado de procedencia viaja en creacion, ciclo de vida y las tres evidencias', async () => {
    const statements = await statementsWithFlag('true')
    const withPredicate = statements.filter(sql => sql.includes("ip.data_origin = 'real'"))

    // inventario + INSERT de membresia + UPDATE de ciclo de vida + 3 inserts de evidencia
    expect(withPredicate).toHaveLength(6)

    // Y siempre por la PERSONA: `candidate_facet` no tiene columna de procedencia propia.
    expect(withPredicate.every(sql => sql.includes('ip.profile_id = cf.identity_profile_id'))).toBe(true)
  })

  it('la membresia sintetica se RECLASIFICA, no se congela', async () => {
    const statements = await statementsWithFlag('true')
    const lifecycle = statements.find(sql => sql.includes('next_state AS'))

    // Si el UPDATE de ciclo de vida se excluyera a si mismo la poblacion sintetica, una membresia
    // que hubiera quedado en `pool_eligible` seguiria contando para siempre en la senal de
    // integridad del Banco de Talento sin que ninguna corrida pudiera corregirla. Entra a la
    // poblacion y sale a un estado no servible.
    expect(lifecycle).toContain('LEFT JOIN greenhouse_core.identity_profiles ip')
    expect(lifecycle).toContain("WHEN NOT is_real THEN 'needs_reconsent'")
    expect(lifecycle).not.toContain(`JOIN greenhouse_core.identity_profiles ip
       ON ip.profile_id = cf.identity_profile_id AND ip.data_origin = 'real'`)
  })

  it('NO depende del flag: corre en Cloud Run, donde ese flag no existe', async () => {
    // Si el filtro estuviera gateado por `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` (Vercel-only), el
    // ops-worker lo leeria indefinido y quedaria OFF en silencio. Este test es el que lo impide.
    const off = await statementsWithFlag('false')

    expect(off.filter(sql => sql.includes("ip.data_origin = 'real'"))).toHaveLength(6)

    vi.clearAllMocks()
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 })

    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', '')
    await reconcileTalentPoolProjection({ apply: true, actorUserId: 'task-1748-test' })
    expect(
      mocks.query.mock.calls.map(call => String(call[0])).filter(sql => sql.includes("ip.data_origin = 'real'"))
    ).toHaveLength(6)
  })
})
