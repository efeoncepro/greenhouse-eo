import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1305 — readSeoAeoGap + classifyQuadrant.
 * Cubre: flag OFF, target_not_found, degradación honesta por lado (no_seo_data /
 * no_aeo_data), cruce en memoria con quadrants, tenant binding (el lado AEO usa el org
 * del target), y el BOUNDARY §1.1: ninguna query emitida mezcla tablas `seo_*` con
 * `grader_*` (el cruce jamás baja a SQL).
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const state = {
  targetOrg: null as string | null,
  seoRows: [] as Array<Record<string, unknown>>,
  aeoRows: [] as Array<Record<string, unknown>>,
  emittedQueries: [] as Array<{ sql: string; params: unknown[] }>
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.emittedQueries.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.targetOrg ? [{ organization_id: state.targetOrg }] : []
    }

    if (sql.includes('seo_gsc_daily')) {
      return state.seoRows
    }

    if (sql.includes('grader_runs')) {
      return state.aeoRows
    }

    return []
  }
}))

import { readSeoAeoGap } from '../read-seo-aeo-gap'
import { classifyQuadrant } from '../quadrant'

const ENV_ON = { GROWTH_SEO_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const ENV_OFF = {} as NodeJS.ProcessEnv

const seoRow = (keyword: string, position: number, impressions = 100) => ({
  keyword,
  page: `https://ejemplo.cl/${keyword.replace(/\s+/g, '-')}`,
  weighted_position: String(position),
  impressions: String(impressions),
  clicks: '10'
})

const aeoRow = (score: number) => ({
  run_id: 'grun-1',
  finished_at: '2026-08-01T12:00:00.000Z',
  overall_score: String(score)
})

beforeEach(() => {
  state.targetOrg = 'org-berel'
  state.seoRows = []
  state.aeoRows = []
  state.emittedQueries = []
})

describe('classifyQuadrant (matriz 2×2, ejes ortogonales)', () => {
  it('clasifica los 4 quadrants', () => {
    expect(classifyQuadrant(3, 80)).toBe('dominante')
    expect(classifyQuadrant(3, 20)).toBe('riesgo')
    expect(classifyQuadrant(45, 80)).toBe('oportunidad')
    expect(classifyQuadrant(45, 20)).toBe('invisible')
  })

  it('umbrales inclusive en el borde (pos 10 = alto; score 50 = citado)', () => {
    expect(classifyQuadrant(10, 50)).toBe('dominante')
    expect(classifyQuadrant(10.01, 50)).toBe('oportunidad')
    expect(classifyQuadrant(10, 49.9)).toBe('riesgo')
  })

  it('acepta umbrales custom sin promediar ejes', () => {
    expect(classifyQuadrant(4, 60, { rankHighMaxPosition: 3, aeoCitedMinScore: 70 })).toBe('invisible')
  })
})

describe('readSeoAeoGap', () => {
  it('flag OFF → disabled sin tocar la base', async () => {
    const r = await readSeoAeoGap('seot-1', {}, ENV_OFF)

    expect(r).toEqual({ ok: false, errorCode: 'disabled', status: null })
    expect(state.emittedQueries).toHaveLength(0)
  })

  it('target inexistente → target_not_found', async () => {
    state.targetOrg = null

    const r = await readSeoAeoGap('seot-x', {}, ENV_ON)

    expect(r).toEqual({ ok: false, errorCode: 'target_not_found', status: null })
  })

  it('sin filas GSC → no_seo_data (y NO consulta el lado AEO)', async () => {
    state.seoRows = []
    state.aeoRows = [aeoRow(80)]

    const r = await readSeoAeoGap('seot-1', {}, ENV_ON)

    expect(r).toEqual({ ok: false, errorCode: 'no_seo_data', status: null })
    expect(state.emittedQueries.some(q => q.sql.includes('grader_runs'))).toBe(false)
  })

  it('sin run reportable → no_aeo_data, NUNCA ceros fantasma', async () => {
    state.seoRows = [seoRow('marketing digital chile', 4)]
    state.aeoRows = []

    const r = await readSeoAeoGap('seot-1', {}, ENV_ON)

    expect(r).toEqual({ ok: false, errorCode: 'no_aeo_data', status: null })
  })

  it('ambos lados → cruce en memoria con quadrants por keyword + domainQuadrant', async () => {
    state.seoRows = [
      seoRow('agencia growth', 2, 500), // página 1 → con score 72: dominante
      seoRow('partner de crecimiento', 35, 200) // página 4 → oportunidad
    ]
    state.aeoRows = [aeoRow(72)]

    const r = await readSeoAeoGap('seot-1', {}, ENV_ON)

    expect(r.ok).toBe(true)

    if (!r.ok) return

    expect(r.organizationId).toBe('org-berel')
    expect(r.aeoAxisGranularity).toBe('domain')
    expect(r.aeoLens).toEqual({
      latestRunId: 'grun-1',
      latestRunAt: '2026-08-01T12:00:00.000Z',
      overallScore: 72,
      cited: true
    })
    expect(r.quadrants).toEqual([
      { keyword: 'agencia growth', rankPosition: 2, aeoScore: 72, quadrant: 'dominante' },
      { keyword: 'partner de crecimiento', rankPosition: 35, aeoScore: 72, quadrant: 'oportunidad' }
    ])

    // domainQuadrant usa la MEJOR posición (2) × citabilidad → dominante.
    expect(r.domainQuadrant).toBe('dominante')

    // Ortogonalidad: ningún campo colapsa los dos ejes en un score combinado.
    const keys = Object.keys(r)

    expect(keys).not.toContain('combinedScore')
    expect(keys).not.toContain('score')
  })

  it('score bajo → riesgo para keywords página 1 (autoridad sin citabilidad)', async () => {
    state.seoRows = [seoRow('agencia creativa', 1, 900)]
    state.aeoRows = [aeoRow(15)]

    const r = await readSeoAeoGap('seot-1', {}, ENV_ON)

    expect(r.ok).toBe(true)

    if (!r.ok) return

    expect(r.quadrants[0].quadrant).toBe('riesgo')
    expect(r.aeoLens.cited).toBe(false)
    expect(r.domainQuadrant).toBe('riesgo')
  })

  it('tenant binding: el lado AEO consulta con el org RESUELTO del target', async () => {
    state.targetOrg = 'org-resuelto-server-side'
    state.seoRows = [seoRow('kw', 5)]
    state.aeoRows = [aeoRow(60)]

    await readSeoAeoGap('seot-1', {}, ENV_ON)

    const aeoQuery = state.emittedQueries.find(q => q.sql.includes('grader_runs'))

    expect(aeoQuery?.params[0]).toBe('org-resuelto-server-side')
  })

  it('BOUNDARY §1.1: ninguna query emitida mezcla tablas seo_* con grader_*', async () => {
    state.seoRows = [seoRow('kw', 5)]
    state.aeoRows = [aeoRow(60)]

    await readSeoAeoGap('seot-1', {}, ENV_ON)

    for (const { sql } of state.emittedQueries) {
      const touchesSeo = /(?:from|join)\s+greenhouse_growth\.seo_/i.test(sql)
      const touchesGrader = /(?:from|join)\s+greenhouse_growth\.grader_/i.test(sql)

      expect(touchesSeo && touchesGrader).toBe(false)
    }
  })

  it('error de query → query_failed sanitizado (sin throw al caller)', async () => {
    state.targetOrg = 'org-berel'
    state.seoRows = [seoRow('kw', 5)]

    // El mock retorna null para el lado AEO → el acceso a la fila revienta DENTRO del
    // try del reader; el caller recibe query_failed, nunca el error crudo.
    state.aeoRows = null as unknown as Array<Record<string, unknown>>

    const r = await readSeoAeoGap('seot-1', {}, ENV_ON)

    expect(r).toEqual({ ok: false, errorCode: 'query_failed', status: null })
  })
})
