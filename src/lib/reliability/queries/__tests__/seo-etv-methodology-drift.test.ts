import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const state = { rows: [] as Array<Record<string, unknown>>, params: [] as unknown[] }

vi.mock('@/lib/db', () => ({
  query: async (_sql: string, params: unknown[]) => {
    state.params = params

    return state.rows
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { getSeoEtvMethodologyDriftSignal } from '../seo-etv-methodology-drift'

const BEFORE = new Date('2026-10-01T12:00:00.000Z')
const AFTER = new Date('2026-11-02T12:00:00.000Z')

const runtimeRow = (runtime: 'ops_worker' | 'vercel', overrides: Record<string, unknown> = {}) => ({
  runtime,
  explicit_rows: 3,
  contract_recent_rows: 0,
  legacy_after_cutoff_rows: 0,
  latest_explicit_version: 'legacy_static_v1',
  latest_policy_version: 'etv-policy.v1',
  latest_requested_at: '2026-09-16T09:00:00.000Z',
  ...overrides
})

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  state.rows = []
  delete process.env.GROWTH_SEO_ETV_METHODOLOGY_VERSION
  delete process.env.GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('TASK-1805 — seo.etv_methodology.drift', () => {
  it('sin evidencia explícita → awaiting_data (rollout pendiente, no drift)', async () => {
    const signal = await getSeoEtvMethodologyDriftSignal(BEFORE)

    expect(signal.signalId).toBe('seo.etv_methodology.drift')
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('awaiting_data')
    expect(signal.summary).toContain('legacy_static_v1 (default)')
  })

  it('worker y Vercel piden lo configurado → ok', async () => {
    state.rows = [runtimeRow('ops_worker'), runtimeRow('vercel')]

    const signal = await getSeoEtvMethodologyDriftSignal(BEFORE)

    expect(signal.severity).toBe('ok')
    expect(signal.evidence.find(item => item.label === 'divergences')?.value).toBe('0')
  })

  it('el worker pidió improved mientras acá se configura legacy → error (drift cross-runtime)', async () => {
    state.rows = [runtimeRow('ops_worker', { latest_explicit_version: 'improved_layout_clickstream_v2' }), runtimeRow('vercel')]

    const signal = await getSeoEtvMethodologyDriftSignal(BEFORE)

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('ops-worker pidió improved_layout_clickstream_v2')
  })

  it('evidencia contractual reciente junto a explícita → warning (un runtime viejo sigue escribiendo)', async () => {
    state.rows = [runtimeRow('ops_worker', { contract_recent_rows: 2 })]

    const signal = await getSeoEtvMethodologyDriftSignal(BEFORE)

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('runtime viejo')
  })

  it('legacy configurado después del corte → error aunque la evidencia coincida', async () => {
    state.rows = [runtimeRow('ops_worker'), runtimeRow('vercel')]

    const signal = await getSeoEtvMethodologyDriftSignal(AFTER)

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('congeladas')
  })

  it('improved configurado después del corte con evidencia improved → ok', async () => {
    process.env.GROWTH_SEO_ETV_METHODOLOGY_VERSION = 'improved_layout_clickstream_v2'
    process.env.GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION = 'improved_layout_clickstream_v2'
    state.rows = [runtimeRow('ops_worker', { latest_explicit_version: 'improved_layout_clickstream_v2' })]

    const signal = await getSeoEtvMethodologyDriftSignal(AFTER)

    expect(signal.severity).toBe('ok')
  })

  it('configuración inválida → error sin tocar la base', async () => {
    process.env.GROWTH_SEO_ETV_METHODOLOGY_VERSION = 'v9'

    const signal = await getSeoEtvMethodologyDriftSignal(BEFORE)

    expect(signal.severity).toBe('error')
    expect(signal.evidence[0]).toMatchObject({ label: 'policyError', value: 'invalid_etv_methodology_config' })
  })

  it('el corte viaja parametrizado al SQL como instante UTC', async () => {
    state.rows = [runtimeRow('ops_worker')]
    await getSeoEtvMethodologyDriftSignal(BEFORE)

    expect(state.params[2]).toBe('2026-11-01T00:00:00.000Z')
  })
})
