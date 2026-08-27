import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1775 — Reader canónico de la foto de dominio.
 *
 * Cubre el contrato de honestidad: `no_market_data` sin ceros fantasma (una fila-marcador con
 * NULLs también resuelve a no_market_data), lens SIEMPRE 'estimated' con capturedAt, la
 * prioridad de fuentes (foto > histórico > screening) y 🔴 que
 * `captured_by_organization_id` no se selecciona NI viaja en el DTO.
 */

vi.mock('server-only', () => ({}))

const state = {
  rows: [] as Array<Record<string, unknown>>,
  queries: [] as Array<{ sql: string; params: unknown[] }>,
  target: { root_domain: 'cliente.cl', location_code: '2152', language_code: 'es' } as Record<string, unknown> | null
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.queries.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    return state.rows
  }
}))

import { readDomainOverview, readDomainOverviewForTarget } from '../reader'

const snapshotRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  domain: 'cliente.cl',
  capture_date: '2026-08-16',
  source_endpoint: 'domain_rank_overview',
  organic_pos_1: 12,
  organic_pos_2_3: 44,
  organic_pos_4_10: 310,
  organic_pos_11_20: 200,
  organic_pos_21_30: 100,
  organic_pos_31_40: 80,
  organic_pos_41_50: 60,
  organic_pos_51_60: 40,
  organic_pos_61_70: 30,
  organic_pos_71_80: 20,
  organic_pos_81_90: 10,
  organic_pos_91_100: 5,
  organic_count: 4120,
  organic_etv: '8210.44',
  organic_estimated_paid_traffic_cost: '15300.20',
  organic_is_new: 30,
  organic_is_up: 120,
  organic_is_down: 80,
  organic_is_lost: 12,
  paid_count: 3,
  paid_etv: '12.50',
  ...overrides
})

beforeEach(() => {
  state.rows = []
  state.queries = []
  state.target = { root_domain: 'cliente.cl', location_code: '2152', language_code: 'es' }
})

describe('readDomainOverview', () => {
  it('sujeto sin filas devuelve no_market_data, nunca ceros', async () => {
    const result = await readDomainOverview({ subject: 'nadie.cl', locationCode: '2152', languageCode: 'es' })

    expect(result).toEqual({ ok: false, reason: 'no_market_data' })
  })

  it('sólo filas-marcador (todo NULL) también resuelve a no_market_data', async () => {
    state.rows = [
      snapshotRow({
        organic_count: null,
        organic_etv: null,
        organic_estimated_paid_traffic_cost: null,
        paid_count: null,
        paid_etv: null,
        organic_pos_1: null,
        organic_pos_2_3: null,
        organic_pos_4_10: null,
        organic_pos_11_20: null,
        organic_pos_21_30: null,
        organic_pos_31_40: null,
        organic_pos_41_50: null,
        organic_pos_51_60: null,
        organic_pos_61_70: null,
        organic_pos_71_80: null,
        organic_pos_81_90: null,
        organic_pos_91_100: null,
        organic_is_new: null,
        organic_is_up: null,
        organic_is_down: null,
        organic_is_lost: null
      })
    ]

    const result = await readDomainOverview({ subject: 'cliente.cl', locationCode: '2152', languageCode: 'es' })

    expect(result).toEqual({ ok: false, reason: 'no_market_data' })
  })

  it('la foto viaja con lens estimated, capturedAt y las cifras del snapshot', async () => {
    state.rows = [snapshotRow()]

    const result = await readDomainOverview({ subject: 'https://www.Cliente.CL', locationCode: '2152', languageCode: 'es' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.lens).toBe('estimated')
    expect(result.subject).toBe('cliente.cl')
    expect(result.capturedAt).toBe('2026-08-16')
    expect(result.organicKeywords).toBe(4120)
    expect(result.organicEtv).toBeCloseTo(8210.44)
    expect(result.organicEstimatedTrafficCostUsd).toBeCloseTo(15300.2)
    expect(result.positionDistribution?.pos4_10).toBe(310)
    expect(result.momentum?.isUp).toBe(120)
  })

  it('🔴 el DTO no contiene captured_by_organization_id y el SQL no lo selecciona', async () => {
    state.rows = [snapshotRow()]

    const result = await readDomainOverview({ subject: 'cliente.cl', locationCode: '2152', languageCode: 'es' })

    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('captured_by')
    expect(serialized).not.toContain('capturedBy')

    const snapshotQuery = state.queries.find(query =>
      query.sql.includes('FROM greenhouse_growth.seo_domain_overview_snapshots')
    )

    expect(snapshotQuery?.sql).not.toContain('captured_by_organization_id')
    expect(snapshotQuery?.sql).not.toContain('provider_cost')
  })

  it('la foto prefiere la fuente más rica y la historia agrupa por mes ascendente', async () => {
    state.rows = [
      // Screening de hoy (más nuevo pero pobre)...
      snapshotRow({
        capture_date: '2026-08-20',
        source_endpoint: 'bulk_traffic_estimation',
        organic_pos_1: null,
        organic_pos_4_10: null,
        organic_pos_11_20: null,
        organic_count: 4000,
        organic_etv: '8000.00'
      }),
      // ...la foto completa del día 16 del mismo mes...
      snapshotRow(),
      // ...y dos meses históricos.
      snapshotRow({ capture_date: '2026-06-01', source_endpoint: 'historical_rank_overview', organic_count: 3800, organic_etv: '7500.00' }),
      snapshotRow({ capture_date: '2026-07-01', source_endpoint: 'historical_rank_overview', organic_count: 3900, organic_etv: '7700.00' })
    ]

    const result = await readDomainOverview({ subject: 'cliente.cl', locationCode: '2152', languageCode: 'es' })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // El screening es más nuevo por fecha, así que es la foto — pero sin posiciones.
    expect(result.source).toBe('bulk_traffic_estimation')
    expect(result.positionDistribution).toBeNull()
    expect(result.momentum).toBeNull()

    // La historia: un punto por mes, y agosto lo gana la foto completa (fuente más rica).
    expect(result.history.map(point => point.month)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(result.history[2].source).toBe('domain_rank_overview')
    expect(result.history[2].organicKeywords).toBe(4120)
  })

  it('historyMonths recorta la trayectoria a los meses más recientes', async () => {
    state.rows = [
      snapshotRow({ capture_date: '2026-05-01', source_endpoint: 'historical_rank_overview' }),
      snapshotRow({ capture_date: '2026-06-01', source_endpoint: 'historical_rank_overview' }),
      snapshotRow({ capture_date: '2026-07-01', source_endpoint: 'historical_rank_overview' })
    ]

    const result = await readDomainOverview({
      subject: 'cliente.cl',
      locationCode: '2152',
      languageCode: 'es',
      historyMonths: 2
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.history.map(point => point.month)).toEqual(['2026-06', '2026-07'])
  })
})

describe('readDomainOverviewForTarget', () => {
  it('resuelve el mercado desde el target y usa su dominio como sujeto por defecto', async () => {
    state.rows = [snapshotRow()]

    const result = await readDomainOverviewForTarget('seot-1')

    expect(result?.ok).toBe(true)

    const snapshotQuery = state.queries.find(query =>
      query.sql.includes('FROM greenhouse_growth.seo_domain_overview_snapshots')
    )

    expect(snapshotQuery?.params[0]).toBe('cliente.cl')
    expect(snapshotQuery?.params[1]).toBe('2152')
  })

  it('target inexistente devuelve null (el lane decide cómo decirlo)', async () => {
    state.target = null

    const result = await readDomainOverviewForTarget('seot-x')

    expect(result).toBeNull()
  })
})
