import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1775 — Backfill histórico (10× el costo del Labs normal).
 *
 * Cubre lo que protege el gasto: la enumeración de meses, el costo determinista, la
 * proyección con filas NULL para meses sin dato (resumibilidad), el pre-check de existencia
 * y el TOPE DURO en USD que corta la corrida aunque el entitlement permita más.
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  target: {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'cliente.cl',
    location_code: '2152',
    language_code: 'es'
  } as Record<string, unknown> | null,
  competitors: [] as Array<{ competitor_domain: string }>,
  existingMonths: [] as Array<{ capture_date: string }>,
  inserts: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('FROM greenhouse_growth.seo_competitors')) {
      return state.competitors
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_domain_overview_snapshots')) {
      state.inserts.push({ sql, params })

      return []
    }

    if (sql.includes('FROM greenhouse_growth.seo_domain_overview_snapshots')) {
      return state.existingMonths
    }

    return []
  }
}))

const gateMock = vi.fn()

vi.mock('../../entitlement', () => ({
  SEO_MODULE_KEY: 'seo_v2',
  SEO_MODULE_KEYS_READ: ['seo_v2'],
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

const flags = { module: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoDomainOverviewEnabled: () => true
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

import {
  backfillDomainRankHistory,
  estimateHistoryCost,
  monthsBetween,
  previewDomainRankHistoryBackfill,
  projectHistoryItems
} from '../history-backfill'

const ETV_FIXTURE = { version: 'legacy_static_v1', evidence: 'explicit_request', requestedAt: '2026-10-15T12:00:00.000Z', policyVersion: 'etv-policy.v1', historicalBasis: null } as const

const historyItem = (year: number, month: number, etv: number) => ({
  se_type: 'google',
  year,
  month,
  metrics: {
    organic: { count: 100, etv, pos_1: 1 },
    paid: { count: 0, etv: 0 }
  }
})

beforeEach(() => {
  state.target = {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'cliente.cl',
    location_code: '2152',
    language_code: 'es'
  }
  state.competitors = []
  state.existingMonths = []
  state.inserts = []
  flags.module = true
  gateMock.mockReset()
  gateMock.mockResolvedValue({ allowed: true, budgetRemainingUsd: 50, blockedReason: null })
  providerMock.mockReset()
  outboxMock.mockReset()
})

describe('monthsBetween', () => {
  it('enumera meses inclusivos cruzando el año', () => {
    expect(monthsBetween('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })

  it('rango de un mes devuelve ese mes', () => {
    expect(monthsBetween('2026-03', '2026-03')).toEqual(['2026-03'])
  })
})

describe('estimateHistoryCost', () => {
  it('task setup 10× + costo por mes; cero meses = cero costo', () => {
    expect(estimateHistoryCost(0).estimatedCostUsd).toBe(0)
    expect(estimateHistoryCost(10).estimatedCostUsd).toBeCloseTo(0.12 + 10 * 0.0012, 6)
  })
})

describe('projectHistoryItems', () => {
  it('meses del rango sin item quedan como fila NULL (resumibilidad, no re-compra)', () => {
    const { snapshots, monthsWithData, monthsWithoutData } = projectHistoryItems(
      [historyItem(2026, 1, 500)],
      {
        domain: 'cliente.cl',
        locationCode: '2152',
        languageCode: 'es',
        requestedMonths: ['2025-12', '2026-01', '2026-02'],
        etvMethodology: ETV_FIXTURE
      }
    )

    expect(snapshots).toHaveLength(3)
    expect(monthsWithData).toBe(1)
    expect(monthsWithoutData).toBe(2)

    const withData = snapshots.find(snapshot => snapshot.captureDate === '2026-01-01')
    const nullRow = snapshots.find(snapshot => snapshot.captureDate === '2025-12-01')

    expect(withData?.organic.etv).toBe(500)
    expect(withData?.sourceEndpoint).toBe('historical_rank_overview')
    expect(nullRow?.organic.count).toBeNull()
  })
})

describe('previewDomainRankHistoryBackfill', () => {
  it('reporta meses pendientes descontando los ya presentes, sin llamar al proveedor', async () => {
    state.existingMonths = [{ capture_date: '2026-01-01' }, { capture_date: '2026-02-01' }]

    const plan = await previewDomainRankHistoryBackfill({
      seoTargetId: 'seot-1',
      fromMonth: '2026-01',
      toMonth: '2026-04'
    })

    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.subjects[0].pendingMonths).toEqual(['2026-03', '2026-04'])
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('rango inválido o anterior al mínimo del proveedor se rechaza', async () => {
    const plan = await previewDomainRankHistoryBackfill({
      seoTargetId: 'seot-1',
      fromMonth: '2019-01',
      toMonth: '2026-01'
    })

    expect(plan).toEqual({ ok: false, errorCode: 'invalid_range', status: null })
  })

  it('la allowlist filtra sujetos del universo declarado, no agrega arbitrarios', async () => {
    state.competitors = [{ competitor_domain: 'competidor.cl' }]

    const plan = await previewDomainRankHistoryBackfill({
      seoTargetId: 'seot-1',
      domains: ['competidor.cl', 'colado.cl'],
      fromMonth: '2026-01',
      toMonth: '2026-02'
    })

    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.subjects.map(subject => subject.domain)).toEqual(['competidor.cl'])
  })
})

describe('backfillDomainRankHistory', () => {
  it('todo presente = already_seeded, cero llamadas, costo cero', async () => {
    state.existingMonths = [{ capture_date: '2026-01-01' }, { capture_date: '2026-02-01' }]

    const result = await backfillDomainRankHistory({
      seoTargetId: 'seot-1',
      fromMonth: '2026-01',
      toMonth: '2026-02'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.alreadySeeded).toBe(1)
    expect(result.costUsd).toBe(0)
    expect(providerMock).not.toHaveBeenCalled()
    expect(gateMock).not.toHaveBeenCalled()
  })

  it('siembra la serie y escribe una fila por mes pedido (con NULLs donde no hay dato)', async () => {
    providerMock.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      cost: 0.1236,
      tasks: [
        {
          status_code: 20000,
          result: [{ items: [historyItem(2026, 1, 500), historyItem(2026, 2, 520)] }]
        }
      ]
    })

    const result = await backfillDomainRankHistory({
      seoTargetId: 'seot-1',
      fromMonth: '2026-01',
      toMonth: '2026-03'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.seeded).toBe(1)
    expect(result.snapshotsWritten).toBe(3)
    expect(state.inserts).toHaveLength(3)
    expect(outboxMock).toHaveBeenCalledTimes(1)
  })

  it('el tope duro corta sujetos aunque el entitlement permita más', async () => {
    state.competitors = [{ competitor_domain: 'competidor.cl' }]
    providerMock.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      cost: 0.15,
      tasks: [{ status_code: 20000, result: [{ items: [historyItem(2026, 1, 500)] }] }]
    })

    // Tope que alcanza para UN sujeto (~0.121) pero no para dos.
    const result = await backfillDomainRankHistory({
      seoTargetId: 'seot-1',
      fromMonth: '2026-01',
      toMonth: '2026-01',
      maxUsd: 0.2
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.seeded).toBe(1)
    expect(result.capBlocked).toBe(1)
    expect(providerMock).toHaveBeenCalledTimes(1)
  })

  it('proveedor sin historia del sujeto = no_history con filas NULL, no error', async () => {
    providerMock.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      cost: 0.12,
      tasks: [{ status_code: 20000, result: [{ items: [] }] }]
    })

    const result = await backfillDomainRankHistory({
      seoTargetId: 'seot-1',
      fromMonth: '2026-01',
      toMonth: '2026-02'
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.noHistory).toBe(1)
    expect(result.snapshotsWritten).toBe(2)
  })

  it('gate bloqueado devuelve el reason sin gastar', async () => {
    gateMock.mockResolvedValue({ allowed: false, budgetRemainingUsd: 0, blockedReason: 'budget_exhausted' })

    const result = await backfillDomainRankHistory({
      seoTargetId: 'seot-1',
      fromMonth: '2026-01',
      toMonth: '2026-02'
    })

    expect(result).toEqual({ ok: false, errorCode: 'budget_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })
})
