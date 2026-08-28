import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1777 — Reader de tres estados + regresión del shape de `readBacklinkProfile`.
 *
 * "No pasó nada" y "no sabemos qué pasó" son conclusiones opuestas: el reader las distingue
 * y ningún consumer puede colapsarlas en "sin datos".
 */

vi.mock('server-only', () => ({}))

const state = {
  target: { organization_id: 'org-1', root_domain: 'cliente.cl' } as Record<string, unknown> | null,
  snapshots: [{ backlink_snapshot_id: 'seobs-1' }] as Array<Record<string, unknown>>,
  verdicts: [] as Array<Record<string, unknown>>,
  domainRows: [] as Array<Record<string, unknown>>,
  anchorRows: [] as Array<Record<string, unknown>>,
  profileRows: [] as Array<Record<string, unknown>>,
  queries: [] as Array<{ sql: string; params: unknown[] }>
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.queries.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets')) return state.target ? [state.target] : []
    if (sql.includes('FROM greenhouse_growth.seo_backlink_drilldowns')) return state.verdicts
    if (sql.includes('FROM greenhouse_growth.seo_backlink_referring_domains')) return state.domainRows
    if (sql.includes('FROM greenhouse_growth.seo_backlink_anchors')) return state.anchorRows

    if (sql.includes('FROM greenhouse_growth.seo_backlink_snapshots')) {
      // El reader del detalle pide el snapshot más reciente; el del perfil pide la serie.
      return sql.includes('new_lost_delta') ? state.profileRows : state.snapshots
    }

    return []
  }
}))

// TASK-1699 — rank-capture (en el grafo de imports de esta suite) ahora carga `@/lib/db`
// y el módulo serp-top-results. Mocks de CARGA: esta suite no ejercita ese camino.
vi.mock('@/lib/db', () => ({
  withTransaction: async (callback: (client: unknown) => Promise<unknown>) =>
    callback({ query: async () => ({ rows: [], rowCount: 1 }) })
}))

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => true,
  isSeoBacklinkDetailEnabled: () => true
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { readBacklinkDetail } from '../detail-reader'
import { readBacklinkProfile } from '../reader'

const verdict = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  backlink_snapshot_id: 'seobs-1',
  capture_date: '2026-08-25',
  organization_id: 'org-1',
  root_domain: 'cliente.cl',
  outcome: 'drilled',
  trigger_reason: 'backlink_movement',
  error_code: null,
  ...overrides
})

beforeEach(() => {
  state.target = { organization_id: 'org-1', root_domain: 'cliente.cl' }
  state.snapshots = [{ backlink_snapshot_id: 'seobs-1' }]
  state.verdicts = []
  state.domainRows = []
  state.anchorRows = []
  state.profileRows = []
  state.queries = []
})

describe('readBacklinkDetail — los tres estados', () => {
  it('snapshot sin veredicto (pre-feature) → no_detail, no un estado inventado', async () => {
    expect(await readBacklinkDetail('seot-1')).toEqual({ ok: false, errorCode: 'no_detail', status: null })
  })

  it('skipped_no_movement es una afirmación positiva (y skipped_partial colapsa ahí)', async () => {
    for (const outcome of ['skipped_no_movement', 'skipped_partial']) {
      state.verdicts = [verdict({ outcome })]

      const result = await readBacklinkDetail('seot-1')

      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.state).toBe('skipped_no_movement')
    }
  })

  it('drilldown_failed viaja con su errorCode — "no sabemos qué pasó" jamás se disfraza de estable', async () => {
    state.verdicts = [verdict({ outcome: 'failed', error_code: 'provider_unreachable' })]

    const result = await readBacklinkDetail('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state).toBe('drilldown_failed')
    if (result.state === 'drilldown_failed') expect(result.errorCode).toBe('provider_unreachable')
  })

  it('available: dominios + anchors + derivación server-side de sobre-optimización', async () => {
    state.verdicts = [verdict()]
    state.domainRows = [
      { referring_domain: 'nuevo.cl', movement: 'new', rank: '35.00', backlinks_to_target: '2', backlink_spam_score: '10.00', first_seen: null, lost_date: null, sample_url_from: 'https://nuevo.cl/x', sample_url_to: null, sample_anchor: 'cliente', sample_dofollow: true },
      { referring_domain: 'se-fue.cl', movement: 'lost', rank: '20.00', backlinks_to_target: null, backlink_spam_score: null, first_seen: null, lost_date: '2026-08-20', sample_url_from: null, sample_url_to: null, sample_anchor: null, sample_dofollow: null }
    ]
    state.anchorRows = [
      { anchor: 'cliente', backlinks: '60', referring_domains: 10, rank: '40.00', backlink_spam_score: '5.00' },
      { anchor: 'mejor servicio', backlinks: '40', referring_domains: 4, rank: '30.00', backlink_spam_score: '8.00' }
    ]

    const result = await readBacklinkDetail('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok || result.state !== 'available') return
    expect(result.newDomains).toBe(1)
    expect(result.lostDomains).toBe(1)
    expect(result.anchorProfile.dominantAnchor).toBe('cliente')
    expect(result.anchorProfile.brandShare).toBeCloseTo(0.6)
    expect(result.anchorProfile.otherShare).toBeCloseTo(0.4)
  })

  it('🔴 el DTO no filtra provider_cost ni ninguna atribución', async () => {
    state.verdicts = [verdict()]

    const result = await readBacklinkDetail('seot-1')

    expect(JSON.stringify(result)).not.toContain('provider_cost')
    expect(JSON.stringify(result)).not.toContain('providerCost')

    for (const query of state.queries) {
      expect(query.sql.includes('seo_backlink_referring_domains') && query.sql.includes('provider_cost')).toBe(false)
    }
  })
})

describe('readBacklinkProfile — regresión del shape (INMUTABLE por contrato de TASK-1777)', () => {
  it('devuelve exactamente las claves de antes: nada nuevo, nada renombrado', async () => {
    state.profileRows = [
      {
        capture_date: '2026-08-25',
        referring_domains: 100,
        backlinks_total: '500',
        domain_rank: '42.00',
        toxic_share: '0.1200',
        new_lost_delta: { newBacklinks: 3, lostBacklinks: 1, windowDays: 30 }
      }
    ]

    const result = await readBacklinkProfile('seot-1')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(Object.keys(result).sort()).toEqual(['ok', 'organizationId', 'points', 'range', 'seoTargetId'])
    expect(Object.keys(result.points[0]).sort()).toEqual([
      'backlinksTotal',
      'date',
      'domainRank',
      'newLostDelta',
      'referringDomains',
      'toxicShare'
    ])
    expect(result.points[0].toxicShare).toBeCloseTo(0.12)
  })
})
