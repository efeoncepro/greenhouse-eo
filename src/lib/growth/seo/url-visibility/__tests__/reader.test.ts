import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1776 — Reader de visibilidad por sujeto-página + lectura de concentración.
 *
 * Cubre: no_market_data sin ceros fantasma, lens 'estimated' + capturedAt, 🔴 cero fuga de
 * captured_by_organization_id, prioridad de fuentes por mes, y el drill-down de concentración
 * ordenado por ETV.
 */

vi.mock('server-only', () => ({}))

const state = {
  rows: [] as Array<Record<string, unknown>>,
  queries: [] as Array<{ sql: string; params: unknown[] }>
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.queries.push({ sql, params })

    return state.rows
  }
}))

import { readUrlVisibility, readVisibilityConcentration } from '../reader'

const snapshotRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  raw_subject: 'cliente.cl/guia',
  capture_date: '2026-08-17',
  source_endpoint: 'ranked_keywords',
  organic_pos_1: 2,
  organic_pos_2_3: 5,
  organic_pos_4_10: 30,
  organic_pos_11_20: 20,
  organic_pos_21_30: 10,
  organic_pos_31_40: 5,
  organic_pos_41_50: 4,
  organic_pos_51_60: 3,
  organic_pos_61_70: 2,
  organic_pos_71_80: 1,
  organic_pos_81_90: 1,
  organic_pos_91_100: 0,
  organic_count: 83,
  organic_etv: '412.55',
  organic_estimated_paid_traffic_cost: '900.10',
  organic_is_new: 3,
  organic_is_up: 10,
  organic_is_down: 4,
  organic_is_lost: 1,
  paid_count: 0,
  paid_etv: '0',
  total_ranked_keywords: 83,
  top_keywords: JSON.stringify([{ keyword: 'guia pintura', position: 4, url: 'https://cliente.cl/guia', searchVolume: 900, etv: 90 }]),
  etv_methodology_version: 'legacy_static_v1',
  etv_methodology_evidence: 'explicit_request',
  etv_policy_version: 'etv-policy.v1',
  ...overrides
})

beforeEach(() => {
  state.rows = []
  state.queries = []
})

describe('readUrlVisibility', () => {
  it('sujeto sin filas devuelve no_market_data; sujeto mal declarado, invalid_subject', async () => {
    expect(await readUrlVisibility({ subject: 'nadie.cl/x', kind: 'url', locationCode: '2152', languageCode: 'es' })).toEqual({
      ok: false,
      reason: 'no_market_data'
    })

    expect(await readUrlVisibility({ subject: 'cliente.cl', kind: 'url', locationCode: '2152', languageCode: 'es' })).toEqual({
      ok: false,
      reason: 'invalid_subject'
    })
  })

  it('la foto viaja con lens estimated, capturedAt, universo total y detalle top-N', async () => {
    state.rows = [snapshotRow()]

    const result = await readUrlVisibility({
      subject: 'https://www.Cliente.CL/guia/',
      kind: 'url',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.subject).toBe('cliente.cl/guia')
    expect(result.lens).toBe('estimated')
    expect(result.capturedAt).toBe('2026-08-17')
    expect(result.totalRankedKeywords).toBe(83)
    expect(result.organicEtv).toBeCloseTo(412.55)
    expect(result.topKeywords?.[0].keyword).toBe('guia pintura')
    expect(result.momentum?.isUp).toBe(10)
  })

  it('🔴 el DTO no contiene captured_by y el SQL no lo selecciona', async () => {
    state.rows = [snapshotRow()]

    const result = await readUrlVisibility({
      subject: 'cliente.cl/guia',
      kind: 'url',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(JSON.stringify(result)).not.toContain('captured_by')
    expect(state.queries[0].sql).not.toContain('captured_by_organization_id')
    expect(state.queries[0].sql).not.toContain('provider_cost')
  })

  it('sólo filas-marcador (todo NULL) resuelve a no_market_data', async () => {
    state.rows = [
      snapshotRow({
        organic_count: null,
        organic_etv: null,
        total_ranked_keywords: null,
        paid_etv: null
      })
    ]

    const result = await readUrlVisibility({
      subject: 'cliente.cl/guia',
      kind: 'url',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result).toEqual({ ok: false, reason: 'no_market_data' })
  })

  it('la historia agrupa por mes y la captura directa manda sobre relevant_pages', async () => {
    state.rows = [
      snapshotRow({ capture_date: '2026-08-20', source_endpoint: 'relevant_pages', organic_etv: '400.00', top_keywords: null }),
      snapshotRow(),
      snapshotRow({ capture_date: '2026-07-17', organic_etv: '380.00' })
    ]

    const result = await readUrlVisibility({
      subject: 'cliente.cl/guia',
      kind: 'url',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.history.map(point => point.month)).toEqual(['2026-07', '2026-08'])
    expect(result.history[1].source).toBe('ranked_keywords')
  })
})

describe('readVisibilityConcentration', () => {
  it('ordena por ETV descendente y expone el capturedAt más reciente', async () => {
    state.rows = [
      { normalized_subject: 'cliente.cl/a', capture_date: '2026-08-10', total_ranked_keywords: 10, organic_count: 10, organic_etv: '50.00', paid_etv: null, etv_methodology_version: 'legacy_static_v1', etv_methodology_evidence: 'explicit_request', etv_policy_version: 'etv-policy.v1' },
      { normalized_subject: 'cliente.cl/b', capture_date: '2026-08-12', total_ranked_keywords: 90, organic_count: 90, organic_etv: '700.00', paid_etv: null, etv_methodology_version: 'legacy_static_v1', etv_methodology_evidence: 'explicit_request', etv_policy_version: 'etv-policy.v1' }
    ]

    const result = await readVisibilityConcentration({
      domain: 'https://www.cliente.cl',
      kind: 'url',
      locationCode: '2152',
      languageCode: 'es'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.items.map(item => item.subject)).toEqual(['cliente.cl/b', 'cliente.cl/a'])
    expect(result.capturedAt).toBe('2026-08-12')
    expect(JSON.stringify(result)).not.toContain('captured_by')
  })

  it('dominio con path se rechaza; sin filas devuelve no_market_data', async () => {
    expect(
      await readVisibilityConcentration({ domain: 'cliente.cl/blog', kind: 'url', locationCode: '2152', languageCode: 'es' })
    ).toEqual({ ok: false, reason: 'invalid_subject' })

    expect(
      await readVisibilityConcentration({ domain: 'cliente.cl', kind: 'subdomain', locationCode: '2152', languageCode: 'es' })
    ).toEqual({ ok: false, reason: 'no_market_data' })
  })
})

describe('TASK-1805 — readUrlVisibility / concentración sirven UNA metodología', () => {
  it('filtra por método en el SQL y expone etvMethodology (los top-N heredan del padre)', async () => {
    state.rows = [snapshotRow()]

    const result = await readUrlVisibility({ subject: 'cliente.cl/guia', kind: 'url', locationCode: '2152', languageCode: 'es' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(state.queries[0].sql).toContain('etv_methodology_version = $6')
    expect(state.queries[0].params[5]).toBe('legacy_static_v1')
    expect(result.etvMethodology).toMatchObject({ version: 'legacy_static_v1', comparability: 'single_methodology' })
  })

  it('la concentración filtra por método y rotula el top-N con su fórmula', async () => {
    state.rows = [
      { normalized_subject: 'cliente.cl/a', capture_date: '2026-08-17', total_ranked_keywords: 10, organic_count: 10, organic_etv: '50', paid_etv: null, etv_methodology_version: 'legacy_static_v1', etv_methodology_evidence: 'explicit_request', etv_policy_version: 'etv-policy.v1' }
    ]

    const result = await readVisibilityConcentration({ domain: 'cliente.cl', kind: 'url', locationCode: '2152', languageCode: 'es' })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(state.queries[0].sql).toContain('etv_methodology_version = $6')
    expect(result.etvMethodology.version).toBe('legacy_static_v1')
  })
})
