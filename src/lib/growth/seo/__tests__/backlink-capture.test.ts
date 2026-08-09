import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1304 Slice 3 — `captureBacklinkSnapshot` + parsers + batch.
 *
 * Invariantes cubiertos: idempotencia sin gasto por `(target, capture_date)`, gate con
 * `consumesAuditAllowance: false` (no consume cupo de audits), summary fallido = NUNCA
 * fabricar snapshot, delta new/lost fallido = snapshot `partial` con delta vacío
 * (honesto), INSERT con `ON CONFLICT DO NOTHING` (trigger prohíbe DO UPDATE), carrera
 * en el INSERT = already_captured, breaker declarado, y per-target resilience del batch.
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
    root_domain: 'berel.cl',
    status: 'active'
  } as Record<string, unknown> | null,
  existingSnapshots: [] as Array<{ backlink_snapshot_id: string }>,
  insertReturns: [{ backlink_snapshot_id: 'seobs-1' }] as Array<{ backlink_snapshot_id: string }>,
  eligibleTargets: [] as Array<{ seo_target_id: string; organization_id: string }>,
  inserts: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM greenhouse_growth.seo_targets t') && sql.includes('module_assignments')) {
      return state.eligibleTargets
    }

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_backlink_snapshots')) {
      state.inserts.push({ sql, params })

      return state.insertReturns
    }

    if (sql.includes('FROM greenhouse_growth.seo_backlink_snapshots')) {
      return state.existingSnapshots
    }

    return []
  }
}))

const gateMock = vi.fn()

vi.mock('../entitlement', () => ({
  SEO_MODULE_KEY: 'seo_v2',
  // Cutover expand/contract (TASK-1310): las lecturas aceptan ambas claves.
  SEO_MODULE_KEYS_READ: ['seo_v2', 'seo_v1'],
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const providerMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

vi.mock('../flags', () => ({
  isSeoModuleEnabled: () => true
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

vi.mock('../rank-capture', () => ({
  resolveSantiagoCaptureDate: () => '2026-08-06'
}))

import {
  BACKLINK_CAPTURE_ESTIMATED_COST_USD,
  captureBacklinkSnapshot,
  parseBacklinksNewLost,
  parseBacklinksSummary,
  runBacklinkCaptureBatch
} from '../backlinks/capture'

const allowedGate = {
  allowed: true,
  tier: 'contracted',
  allowanceRemaining: 8,
  budgetRemainingUsd: 40,
  blockedReason: null
}

const summaryResponse = (options: { cost?: number; statusCode?: number } = {}) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/backlinks/summary/live',
  cost: options.cost ?? 0.025,
  latencyMs: 5,
  secretSource: 'env',
  tasks: [
    {
      status_code: options.statusCode ?? 20000,
      result: [
        {
          target: 'berel.cl',
          rank: 38.5,
          backlinks: 12480,
          referring_domains: 312,
          backlinks_spam_score: 22
        }
      ]
    }
  ]
})

const newLostResponse = (options: { cost?: number } = {}) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/backlinks/bulk_new_lost_backlinks/live',
  cost: options.cost ?? 0.02,
  latencyMs: 5,
  secretSource: 'env',
  tasks: [
    {
      status_code: 20000,
      result: [{ items: [{ target: 'berel.cl', new_backlinks: 45, lost_backlinks: 12 }] }]
    }
  ]
})

beforeEach(() => {
  state.target = {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'berel.cl',
    status: 'active'
  }
  state.existingSnapshots = []
  state.insertReturns = [{ backlink_snapshot_id: 'seobs-1' }]
  state.eligibleTargets = []
  state.inserts = []

  gateMock.mockReset()
  gateMock.mockResolvedValue(allowedGate)
  providerMock.mockReset()
  providerMock.mockResolvedValueOnce(summaryResponse()).mockResolvedValueOnce(newLostResponse())
  outboxMock.mockReset()
  outboxMock.mockResolvedValue('outbox-1')
})

describe('parsers puros', () => {
  it('parseBacklinksSummary extrae el perfil', () => {
    expect(parseBacklinksSummary(summaryResponse().tasks)).toEqual({
      referringDomains: 312,
      backlinksTotal: 12480,
      domainRank: 38.5,
      backlinksSpamScore: 22
    })
  })

  it('parseBacklinksSummary rechaza tasks con status_code de error (HTTP 200 ≠ éxito)', () => {
    expect(parseBacklinksSummary(summaryResponse({ statusCode: 40501 }).tasks)).toBeNull()
  })

  it('parseBacklinksNewLost extrae el flujo new/lost', () => {
    expect(parseBacklinksNewLost(newLostResponse().tasks)).toEqual({ newBacklinks: 45, lostBacklinks: 12 })
  })
})

describe('captureBacklinkSnapshot', () => {
  it('captura el snapshot con las dos llamadas y persiste con ON CONFLICT DO NOTHING', async () => {
    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toMatchObject({ ok: true, status: 'captured', captureDate: '2026-08-06' })

    expect(gateMock).toHaveBeenCalledWith('org-1', {
      estimatedCostUsd: BACKLINK_CAPTURE_ESTIMATED_COST_USD,
      consumesAuditAllowance: false
    })

    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0].sql).toContain('ON CONFLICT (seo_target_id, capture_date) DO NOTHING')

    // toxic_share = spam score / 100; delta con ventana declarada.
    expect(state.inserts[0].params[5]).toBeCloseTo(0.22)
    expect(JSON.parse(state.inserts[0].params[6] as string)).toEqual({
      newBacklinks: 45,
      lostBacklinks: 12,
      windowDays: 30
    })

    expect(outboxMock).toHaveBeenCalledTimes(1)
    expect(outboxMock.mock.calls[0][0]).toMatchObject({
      eventType: 'growth.seo.backlink_snapshot.captured',
      payload: expect.objectContaining({ backlinkSnapshotId: 'seobs-1' })
    })
  })

  it('re-run del mismo día = already_captured sin gasto', async () => {
    state.existingSnapshots = [{ backlink_snapshot_id: 'seobs-0' }]

    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toMatchObject({ ok: true, status: 'already_captured', providerCostUsd: 0 })
    expect(gateMock).not.toHaveBeenCalled()
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('summary fallido = NUNCA fabricar snapshot', async () => {
    providerMock.mockReset()
    providerMock.mockResolvedValueOnce({
      ok: false,
      httpStatus: 500,
      endpoint: '/v3/backlinks/summary/live',
      tasks: [],
      cost: null,
      latencyMs: 5,
      secretSource: 'env',
      breakerOpen: false
    })

    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'provider_error', status: null })
    expect(state.inserts).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('breaker abierto en la familia backlinks se declara (aislado de onpage/serp)', async () => {
    providerMock.mockReset()
    providerMock.mockResolvedValueOnce({
      ok: false,
      httpStatus: 0,
      endpoint: '/v3/backlinks/summary/live',
      tasks: [],
      cost: null,
      latencyMs: 0,
      secretSource: 'unconfigured',
      breakerOpen: true
    })

    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'breaker_open', status: null })
  })

  it('delta new/lost fallido = snapshot partial con delta vacío (honesto)', async () => {
    providerMock.mockReset()
    providerMock.mockResolvedValueOnce(summaryResponse()).mockResolvedValueOnce({
      ok: false,
      httpStatus: 500,
      endpoint: '/v3/backlinks/bulk_new_lost_backlinks/live',
      tasks: [],
      cost: null,
      latencyMs: 5,
      secretSource: 'env',
      breakerOpen: false
    })

    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toMatchObject({ ok: true, status: 'partial' })
    expect(JSON.parse(state.inserts[0].params[6] as string)).toEqual({})
  })

  it('carrera en el INSERT (DO NOTHING sin fila) = already_captured', async () => {
    state.insertReturns = []

    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toMatchObject({ ok: true, status: 'already_captured' })
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('gate bloqueado no llama al provider', async () => {
    gateMock.mockResolvedValue({
      allowed: false,
      tier: 'trial',
      allowanceRemaining: 0,
      budgetRemainingUsd: 0,
      blockedReason: 'budget_exhausted'
    })

    const result = await captureBacklinkSnapshot('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'budget_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })
})

describe('runBacklinkCaptureBatch', () => {
  it('per-target resilience: un target bloqueado no impide capturar el resto', async () => {
    state.eligibleTargets = [
      { seo_target_id: 'seot-1', organization_id: 'org-1' },
      { seo_target_id: 'seot-2', organization_id: 'org-2' }
    ]

    gateMock
      .mockResolvedValueOnce({
        allowed: false,
        tier: 'trial',
        allowanceRemaining: 0,
        budgetRemainingUsd: 0,
        blockedReason: 'budget_exhausted'
      })
      .mockResolvedValueOnce(allowedGate)

    // El primer target no llega al provider; el segundo consume summary + delta.
    providerMock.mockReset()
    providerMock.mockResolvedValueOnce(summaryResponse()).mockResolvedValueOnce(newLostResponse())

    const summary = await runBacklinkCaptureBatch()

    expect(summary.targets).toBe(2)
    expect(summary.blocked).toBe(1)
    expect(summary.captured).toBe(1)
  })
})
