import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1699 Slice 4 — descubrimiento de competidores por recurrencia (propone, no declara).
 *
 * El SQL (percentile_cont, HAVING con umbrales, DATE − int) se ejercita contra PG real en
 * el sanity de la task (gate TASK-893); acá se afirma el contrato TS: umbrales como
 * parámetros (no números en la query), exclusiones, alreadyDeclared, proposalRef y gates.
 */

vi.mock('server-only', () => ({}))

interface QueryCall {
  sql: string
  params: unknown[]
}

const state = {
  moduleEnabled: true,
  topResultsEnabled: true,
  hasModule: true,
  organizationId: 'org-1' as string | null,
  candidateRows: [] as Array<Record<string, unknown>>,
  topRows: [] as Array<Record<string, unknown>>,
  declared: [] as string[],
  calls: [] as QueryCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[]) => {
    state.calls.push({ sql, params })

    if (sql.includes('SELECT organization_id')) {
      return state.organizationId ? [{ organization_id: state.organizationId }] : []
    }

    if (sql.includes('GROUP BY result_domain')) {
      return state.candidateRows
    }

    if (sql.includes('FROM greenhouse_growth.seo_serp_top_results')) {
      return state.topRows
    }

    return []
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('../competitors', () => ({
  listActiveCompetitors: async () =>
    state.declared.map(domain => ({ competitorDomain: domain }))
}))

vi.mock('../entitlement', () => ({
  resolveSeoEntitlement: async () => ({ hasModule: state.hasModule })
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => state.moduleEnabled,
  isSeoSerpTopResultsEnabled: () => state.topResultsEnabled
}))

const {
  readSerpCompetitorCandidates,
  readSerpTopResults,
  SERP_COMPETITOR_DISCOVERY_MIN_DAYS,
  SERP_COMPETITOR_DISCOVERY_MIN_KEYWORDS,
  SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS
} = await import('../competitor-discovery')

beforeEach(() => {
  state.moduleEnabled = true
  state.topResultsEnabled = true
  state.hasModule = true
  state.organizationId = 'org-1'
  state.candidateRows = []
  state.topRows = []
  state.declared = []
  state.calls = []
})

describe('readSerpCompetitorCandidates', () => {
  it('umbrales versionados viajan como PARÁMETROS, con exclusiones en el SQL', async () => {
    const result = await readSerpCompetitorCandidates('seot-1')

    expect(result.ok).toBe(true)

    const query = state.calls.find(call => call.sql.includes('GROUP BY result_domain'))

    expect(query?.params).toEqual([
      'seot-1',
      SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS,
      SERP_COMPETITOR_DISCOVERY_MIN_KEYWORDS,
      SERP_COMPETITOR_DISCOVERY_MIN_DAYS
    ])
    expect(query?.sql).toContain('is_own_domain = FALSE')
    expect(query?.sql).toContain("item_type = 'organic'")
    // Gate TASK-893: DATE − int, jamás EXTRACT(EPOCH FROM ...).
    expect(query?.sql).toContain('CURRENT_DATE - $2::int')
    expect(query?.sql).not.toContain('EXTRACT')
  })

  it('marca alreadyDeclared y arma el proposalRef con la evidencia medida', async () => {
    state.candidateRows = [
      { result_domain: 'comex.com.mx', keywords_count: 12, days_count: 9, median_position: 4.25, best_position: 1, last_seen: '2026-08-28' },
      { result_domain: 'nuevo.cl', keywords_count: 4, days_count: 6, median_position: 11, best_position: 7, last_seen: '2026-08-27' }
    ]
    state.declared = ['comex.com.mx']

    const result = await readSerpCompetitorCandidates('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.candidates[0]).toMatchObject({
      domain: 'comex.com.mx',
      alreadyDeclared: true,
      medianPosition: 4.3,
      proposalRef: 'serp_top:v1:comex.com.mx:kw=12:days=9:med=4.3:win=30d'
    })
    expect(result.candidates[1]).toMatchObject({ domain: 'nuevo.cl', alreadyDeclared: false })
  })

  it('propone, no declara: cero INSERT/UPDATE en todo el camino', async () => {
    state.candidateRows = [
      { result_domain: 'x.cl', keywords_count: 5, days_count: 6, median_position: 3, best_position: 2, last_seen: '2026-08-28' }
    ]

    await readSerpCompetitorCandidates('seot-1')

    expect(state.calls.every(call => !/INSERT|UPDATE|DELETE/i.test(call.sql))).toBe(true)
  })

  it('gates honestos: módulo/flag apagado, target ausente, sin entitlement', async () => {
    state.topResultsEnabled = false
    expect(await readSerpCompetitorCandidates('seot-1')).toMatchObject({ errorCode: 'disabled' })

    state.topResultsEnabled = true
    state.organizationId = null
    expect(await readSerpCompetitorCandidates('seot-1')).toMatchObject({ errorCode: 'target_not_found' })

    state.organizationId = 'org-1'
    state.hasModule = false
    expect(await readSerpCompetitorCandidates('seot-1')).toMatchObject({ errorCode: 'no_entitlement' })
  })
})

describe('readSerpTopResults', () => {
  const topRow = (keyword: string, rankAbsolute: number) => ({
    keyword,
    engine: 'google',
    device: 'desktop',
    capture_date: '2026-08-28',
    rank_absolute: rankAbsolute,
    rank_group: rankAbsolute,
    item_type: 'organic',
    result_domain: 'rival.cl',
    result_url: null,
    result_title: null,
    is_own_domain: false
  })

  it('lee la serie con filtros y declara hasMore cuando el límite corta', async () => {
    state.topRows = [topRow('a', 1), topRow('a', 2), topRow('a', 3)]

    const result = await readSerpTopResults('seot-1', { keyword: 'A ', limit: 2 })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(2)
    expect(result.hasMore).toBe(true)

    const query = state.calls.find(call => call.sql.includes('rank_absolute, rank_group'))

    // La keyword se normaliza (lowercase/trim) y el LIMIT pide una fila extra (limit+1).
    expect(query?.params).toContain('a')
    expect(query?.params).toContain(3)
  })

  it('flag OFF: los readers no exponen una tabla vacía', async () => {
    state.topResultsEnabled = false
    expect(await readSerpTopResults('seot-1')).toMatchObject({ errorCode: 'disabled' })
  })
})
