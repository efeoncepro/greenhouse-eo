import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ run: vi.fn(), query: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.run,
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mocks.query }) => unknown) =>
    callback({ query: mocks.query })
}))

import { archiveSyntheticRecords } from './purge'

const ACTOR = 'user-task-1748-test'
const REASON = 'archivado de prueba de la task 1748'

const sqlStatements = () => mocks.query.mock.calls.map(call => String(call[0]))

describe('TASK-1748 — archivar tiene eje propio y NUNCA escribe stage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.run.mockResolvedValue([])
  })

  it('la postulación se archiva en `archived_at`, y ningún camino toca `stage`', async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ data_origin: 'smoke_test', stage: 'shortlisted', archived_at: null }] })
      .mockResolvedValue({ rows: [] })

    const summary = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: ['happ-1'],
      actorUserId: ACTOR,
      reason: REASON
    })

    expect(summary.results).toEqual([
      { recordType: 'hiring_application', recordId: 'happ-1', outcome: 'archived' }
    ])

    const updates = sqlStatements().filter(sql => sql.includes('UPDATE greenhouse_hiring.hiring_application'))

    expect(updates).toHaveLength(1)
    expect(updates[0]).toContain('archived_at = NOW()')

    // Ésta es LA aserción de la task: el `UPDATE ... SET stage='closed'` de TASK-1739 es
    // exactamente el que produjo las 32 filas `closed` sin desenlace. Ningún camino de escritura lo
    // escribe — se mira sólo lo que MUTA, porque el SELECT sí lee `stage` (viaja al audit como
    // contexto) y una aserción sobre todos los statements confundiría leer con escribir.
    const writes = sqlStatements().filter(sql => sql.startsWith('UPDATE') || sql.startsWith('INSERT'))

    expect(writes.some(sql => /\bSET\b[\s\S]*\bstage\b/.test(sql))).toBe(false)
    expect(writes.some(sql => sql.includes("'closed'"))).toBe(false)
  })

  it('la guarda de idempotencia lee el archivado, no `stage`', async () => {
    // Una postulación que quedó en `closed` por cualquier otra razón NO cuenta como archivada.
    mocks.query
      .mockResolvedValueOnce({ rows: [{ data_origin: 'smoke_test', stage: 'closed', archived_at: null }] })
      .mockResolvedValue({ rows: [] })

    const first = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: ['happ-closed'],
      actorUserId: ACTOR,
      reason: REASON
    })

    expect(first.results[0]).toMatchObject({ outcome: 'archived' })

    vi.clearAllMocks()
    mocks.query
      .mockResolvedValueOnce({
        rows: [{ data_origin: 'smoke_test', stage: 'shortlisted', archived_at: '2026-08-18T00:00:00.000Z' }]
      })
      .mockResolvedValue({ rows: [] })

    const second = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: ['happ-archivada'],
      actorUserId: ACTOR,
      reason: REASON
    })

    expect(second.results[0]).toMatchObject({ outcome: 'skipped', reasonCode: 'already_archived' })
    expect(sqlStatements().some(sql => sql.startsWith('UPDATE'))).toBe(false)
  })

  it('un dato real nunca se archiva por esta vía, en ninguna de las tres entidades', async () => {
    mocks.query.mockResolvedValue({ rows: [{ data_origin: 'real', stage: 'shortlisted', archived_at: null, status: 'active', publication_status: 'draft' }] })

    const summary = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: ['happ-real'],
      candidateFacetIds: ['cndf-real'],
      openingIds: ['opng-real'],
      actorUserId: ACTOR,
      reason: REASON
    })

    expect(summary.results.every(r => r.outcome === 'skipped' && r.reasonCode === 'not_synthetic')).toBe(true)
    expect(sqlStatements().some(sql => sql.startsWith('UPDATE') || sql.includes('INSERT'))).toBe(false)
  })

  it('archiva las TRES entidades y deja una fila de audit por cada una', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM greenhouse_hiring.hiring_application')) {
        return { rows: [{ data_origin: 'smoke_test', stage: 'sourced', archived_at: null }] }
      }

      if (sql.includes('FROM greenhouse_hiring.candidate_facet')) {
        return { rows: [{ status: 'active', data_origin: 'smoke_test' }] }
      }

      if (sql.includes('FROM greenhouse_hiring.hiring_opening')) {
        return { rows: [{ data_origin: 'smoke_test', status: 'active', publication_status: 'published' }] }
      }

      return { rows: [] }
    })

    const summary = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: ['happ-1'],
      candidateFacetIds: ['cndf-1'],
      openingIds: ['opng-1'],
      actorUserId: ACTOR,
      reason: REASON
    })

    expect(summary.results.map(r => r.recordType)).toEqual([
      'hiring_application',
      'candidate_facet',
      'hiring_opening'
    ])
    expect(summary.results.every(r => r.outcome === 'archived')).toBe(true)

    const audits = mocks.query.mock.calls.filter(call =>
      String(call[0]).includes('INSERT INTO greenhouse_hiring.hiring_data_origin_audit')
    )

    expect(audits).toHaveLength(3)
    expect(audits.map(call => (call[1] as unknown[])[0])).toEqual([
      'hiring_application',
      'candidate_facet',
      'hiring_opening'
    ])

    // Una vacante `cancelled` que sigue diciendo `published` es una contradicción, y contradice la
    // guarda de `publishOpening`: la publicación se cierra junto con el estado.
    const openingUpdate = sqlStatements().find(sql => sql.includes('UPDATE greenhouse_hiring.hiring_opening'))

    expect(openingUpdate).toContain("status = 'cancelled'")
    expect(mocks.query.mock.calls.find(call => String(call[0]).includes('UPDATE greenhouse_hiring.hiring_opening'))?.[1]).toEqual([
      'opng-1',
      'closed'
    ])
  })

  it('no reescribe el desenlace de una vacante que alguien ya cerró o llenó', async () => {
    for (const status of ['closed', 'filled', 'cancelled']) {
      vi.clearAllMocks()
      mocks.query.mockResolvedValue({
        rows: [{ data_origin: 'smoke_test', status, publication_status: 'closed' }]
      })

      const summary = await archiveSyntheticRecords({
        lane: 'archive',
        applicationIds: [],
        openingIds: ['opng-terminal'],
        actorUserId: ACTOR,
        reason: REASON
      })

      expect(summary.results[0]).toMatchObject({ outcome: 'skipped', reasonCode: 'already_archived' })
      expect(sqlStatements().some(sql => sql.startsWith('UPDATE'))).toBe(false)
    }
  })

  it('sin allowlist de fichas ni vacantes no escribe en esas entidades', async () => {
    mocks.query.mockResolvedValue({ rows: [{ data_origin: 'smoke_test', stage: 'sourced', archived_at: null }] })

    const summary = await archiveSyntheticRecords({
      lane: 'archive',
      applicationIds: ['happ-1'],
      actorUserId: ACTOR,
      reason: REASON
    })

    expect(summary.results.map(r => r.recordType)).toEqual(['hiring_application'])
    expect(sqlStatements().some(sql => sql.includes('candidate_facet') || sql.includes('hiring_opening'))).toBe(false)
  })
})
