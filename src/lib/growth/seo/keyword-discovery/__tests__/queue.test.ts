import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1664 — Enqueue + action log.
 *
 * Cubre lo que decide si esta task gasta bien o mal ANTES del proveedor: flags, resolución
 * y validación de seeds, límites, gate de entitlement, idempotencia transaccional y el
 * boundary de no-tracking (ninguna pieza de discovery escribe `seo_keyword_set_members`).
 *
 * El SQL real se ejercita contra PG en `scripts/growth/_sanity-task-1664-keyword-discovery.ts`
 * (gate TASK-893: los mocks ejercitan el TS, no el SQL).
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
    root_domain: 'ejemplo.cl',
    location_code: '2152',
    language_code: 'es'
  } as Record<string, unknown> | null,
  gscQueries: [] as Array<{ query: string; impressions: string }>,
  trackedKeywords: [] as Array<{ keyword: string }>,
  candidates: [] as Array<{ candidate_id: string }>,
  existingRun: null as { run_id: string; estimated_cost_usd: string } | null,
  insertRunReturns: true,
  actionInsertReturns: true,
  calls: [] as SqlCall[]
}

const routeSql = async (sql: string, params: unknown[] = []) => {
  state.calls.push({ sql, params })

  if (sql.includes('FROM greenhouse_growth.seo_targets')) {
    return state.target ? [state.target] : []
  }

  if (sql.includes('FROM greenhouse_growth.seo_gsc_daily')) {
    return state.gscQueries
  }

  if (sql.includes('FROM greenhouse_growth.seo_keyword_set_members')) {
    return state.trackedKeywords
  }

  if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_runs')) {
    return state.insertRunReturns ? [{ run_id: 'seokdr-new' }] : []
  }

  if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_runs')) {
    return state.existingRun ? [state.existingRun] : []
  }

  if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_actions')) {
    return state.actionInsertReturns ? [{ action_id: 'seokda-new' }] : []
  }

  if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_actions')) {
    return [{ action_id: 'seokda-existing' }]
  }

  if (sql.includes('FROM greenhouse_growth.seo_keyword_discovery_candidates')) {
    return state.candidates
  }

  return []
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => routeSql(sql, params ?? []),
  withGreenhousePostgresTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: async (sql: string, params?: unknown[]) => ({ rows: await routeSql(sql, params ?? []) })
    })
}))

const outboxMock = vi.fn()

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => outboxMock(...args)
}))

const gateMock = vi.fn()

vi.mock('../../entitlement', () => ({
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

const flags = { module: true, discovery: true }

vi.mock('../../flags', () => ({
  isSeoModuleEnabled: () => flags.module,
  isSeoKeywordDiscoveryEnabled: () => flags.discovery
}))

const resolveTargetMock = vi.fn()

vi.mock('../../resolve-target', () => ({
  resolveSeoTargetForMarket: (...args: unknown[]) => resolveTargetMock(...args)
}))

import { estimateDiscoveryCost } from '../contracts'
import { previewKeywordDiscovery, queueKeywordDiscovery, recordKeywordDiscoveryAction } from '../queue'

const okGate = { allowed: true, tier: 'contracted', allowanceRemaining: 5, budgetRemainingUsd: 40, blockedReason: null }

const baseInput = {
  organizationId: 'org-1',
  seoTargetId: 'seot-1',
  seedSource: 'manual' as const,
  manualSeeds: ['pintura industrial', 'pintura para fachadas'],
  methods: [{ method: 'keyword_suggestions' as const, resultsPerCall: 50 }],
  actor: 'user-1'
}

beforeEach(() => {
  state.target = {
    seo_target_id: 'seot-1',
    organization_id: 'org-1',
    root_domain: 'ejemplo.cl',
    location_code: '2152',
    language_code: 'es'
  }
  state.gscQueries = []
  state.trackedKeywords = []
  state.candidates = []
  state.existingRun = null
  state.insertRunReturns = true
  state.actionInsertReturns = true
  state.calls = []
  outboxMock.mockReset()
  gateMock.mockReset()
  gateMock.mockResolvedValue(okGate)
  resolveTargetMock.mockReset()
  flags.module = true
  flags.discovery = true
})

describe('queueKeywordDiscovery — flags y validación', () => {
  it('con el flag OFF devuelve disabled sin insertar ni consultar nada', async () => {
    flags.discovery = false

    const result = await queueKeywordDiscovery(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'seo_keyword_discovery_disabled' })
    expect(state.calls).toHaveLength(0)
    expect(gateMock).not.toHaveBeenCalled()
  })

  it('una seed inválida no llega al transporte: rechaza con razón tipada', async () => {
    const result = await queueKeywordDiscovery({
      ...baseInput,
      manualSeeds: ['uno dos tres cuatro cinco seis siete ocho nueve diez once']
    })

    expect(result).toEqual({ ok: false, errorCode: 'invalid_seed', reason: 'too_many_words' })
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('más de 10 seeds (después de dedupe) es limit_exceeded', async () => {
    const seeds = Array.from({ length: 11 }, (_, index) => `keyword ${index}`)

    const result = await queueKeywordDiscovery({ ...baseInput, manualSeeds: seeds })

    expect(result).toEqual({ ok: false, errorCode: 'limit_exceeded', reason: 'too_many_seeds' })
  })

  it('un target de otra org responde target_not_found (anti-oracle)', async () => {
    state.target = null

    const result = await queueKeywordDiscovery(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'target_not_found' })
  })

  it('target_domain sólo admite keywords_for_site', async () => {
    const result = await queueKeywordDiscovery({
      ...baseInput,
      seedSource: 'target_domain',
      manualSeeds: undefined,
      methods: [{ method: 'keyword_suggestions' }]
    })

    expect(result).toEqual({
      ok: false,
      errorCode: 'invalid_seed',
      reason: 'target_domain_requires_keywords_for_site'
    })
  })
})

describe('queueKeywordDiscovery — gate de gasto', () => {
  it('si el presupuesto no alcanza NO se encola (budget_blocked, cero inserts)', async () => {
    gateMock.mockResolvedValue({ ...okGate, allowed: false, blockedReason: 'budget_exhausted' })

    const result = await queueKeywordDiscovery(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'budget_blocked', blockedReason: 'budget_exhausted' })
    expect(state.calls.some(call => call.sql.includes('INSERT INTO'))).toBe(false)
  })

  it('sin entitlement responde forbidden', async () => {
    gateMock.mockResolvedValue({ ...okGate, allowed: false, blockedReason: 'no_entitlement' })

    const result = await queueKeywordDiscovery(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'forbidden', blockedReason: 'no_entitlement' })
  })

  it('el gate recibe el estimado del batch completo y consumesAuditAllowance=false', async () => {
    await queueKeywordDiscovery(baseInput)

    const expected = estimateDiscoveryCost({
      seedCount: 2,
      methods: [{ method: 'keyword_suggestions', resultsPerCall: 50 }]
    })

    expect(gateMock).toHaveBeenCalledWith(
      'org-1',
      { estimatedCostUsd: expected.estimatedCostUsd, consumesAuditAllowance: false },
      expect.anything()
    )
  })
})

describe('queueKeywordDiscovery — enqueue transaccional', () => {
  it('happy path: inserta run pending + outbox en la misma transacción', async () => {
    const result = await queueKeywordDiscovery(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.runId).toBe('seokdr-new')
    expect(result.deduped).toBe(false)
    expect(result.seedCount).toBe(2)
    expect(result.formula).toContain('task setup')

    expect(outboxMock).toHaveBeenCalledTimes(1)

    const [event, client] = outboxMock.mock.calls[0]

    expect(event.eventType).toBe('growth.seo.keyword_discovery.requested')
    expect(event.payload.runId).toBe('seokdr-new')
    // El client de la transacción viaja al publisher: evento atómico con el insert.
    expect(client).toBeDefined()
  })

  it('TASK-1694: el snapshot de la corrida registra la política de inclusión por método', async () => {
    await queueKeywordDiscovery(baseInput)

    const insert = state.calls.find(call =>
      call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_runs')
    )

    const methodsJson = insert?.params.find(
      param => typeof param === 'string' && param.includes('"method"')
    ) as string

    // Sin la política persistida, una corrida vieja deja de ser interpretable tras un cambio:
    // nadie sabría si el long-tail sin volumen faltó porque no existía o porque no se compró.
    expect(JSON.parse(methodsJson)).toEqual([
      expect.objectContaining({ method: 'keyword_suggestions', volumePolicy: 'all' })
    ])
  })

  it('auditoría SEO: la key auto derivada cambia con el ciclo mensual (mismo intent, otro mes)', async () => {
    const autoKeyOf = () => {
      const insert = state.calls.find(
        call => call.sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_runs')
      )

      return insert?.params.find(param => typeof param === 'string' && param.startsWith('auto-'))
    }

    vi.useFakeTimers()

    try {
      vi.setSystemTime(new Date('2026-08-14T12:00:00Z'))
      await queueKeywordDiscovery(baseInput)

      const augustKey = autoKeyOf()

      state.calls = []
      vi.setSystemTime(new Date('2026-09-02T12:00:00Z'))
      await queueKeywordDiscovery(baseInput)

      const septemberKey = autoKeyOf()

      // Mismo intent: dentro del mes dedupea; un mes nuevo permite una corrida fresca (las
      // métricas Labs refrescan mensualmente — congelar el intent para siempre mataba el
      // descubrimiento de keywords emergentes).
      expect(augustKey).toBeDefined()
      expect(septemberKey).toBeDefined()
      expect(augustKey).not.toBe(septemberKey)
    } finally {
      vi.useRealTimers()
    }
  })

  it('el mismo intent devuelve la corrida existente sin insertar ni emitir outbox', async () => {
    state.insertRunReturns = false
    state.existingRun = { run_id: 'seokdr-existing', estimated_cost_usd: '0.03' }

    const result = await queueKeywordDiscovery(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.runId).toBe('seokdr-existing')
    expect(result.deduped).toBe(true)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('una corrida GSC-only (sin métodos) se encola con costo estimado CERO', async () => {
    state.gscQueries = [
      { query: 'pintura para piso', impressions: '900' },
      { query: 'esmalte al agua', impressions: '400' }
    ]

    const result = await queueKeywordDiscovery({
      ...baseInput,
      seedSource: 'gsc_queries',
      manualSeeds: undefined,
      methods: []
    })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.estimatedCostUsd).toBe(0)
    expect(result.providerCalls).toBe(0)
  })

  it('ninguna llamada del enqueue toca seo_keyword_set_members con un write', async () => {
    await queueKeywordDiscovery(baseInput)

    const writesToSet = state.calls.filter(
      call => call.sql.includes('seo_keyword_set_members') && !call.sql.trimStart().startsWith('SELECT')
    )

    expect(writesToSet).toHaveLength(0)
  })
})

describe('recordKeywordDiscoveryAction — log append-only', () => {
  it('un candidate de otra org responde run_not_found (anti-oracle)', async () => {
    state.candidates = []

    const result = await recordKeywordDiscoveryAction({
      organizationId: 'org-1',
      candidateId: 'seokdc-ajeno',
      actionKind: 'dismissed',
      actor: 'user-1'
    })

    expect(result).toEqual({ ok: false, errorCode: 'run_not_found' })
  })

  it('inserta la acción y es idempotente por (org, idempotency_key)', async () => {
    state.candidates = [{ candidate_id: 'seokdc-1' }]

    const first = await recordKeywordDiscoveryAction({
      organizationId: 'org-1',
      candidateId: 'seokdc-1',
      actionKind: 'selected_for_target',
      actor: 'user-1'
    })

    expect(first).toEqual({ ok: true, actionId: 'seokda-new', deduped: false })

    state.actionInsertReturns = false

    const second = await recordKeywordDiscoveryAction({
      organizationId: 'org-1',
      candidateId: 'seokdc-1',
      actionKind: 'selected_for_target',
      actor: 'user-1'
    })

    expect(second).toEqual({ ok: true, actionId: 'seokda-existing', deduped: true })
  })

  it('candidate_does_not_track: registrar una acción JAMÁS escribe seo_keyword_set_members', async () => {
    state.candidates = [{ candidate_id: 'seokdc-1' }]

    await recordKeywordDiscoveryAction({
      organizationId: 'org-1',
      candidateId: 'seokdc-1',
      actionKind: 'promoted_to_tracking',
      actor: 'user-1'
    })

    const touchesSet = state.calls.filter(call => call.sql.includes('seo_keyword_set_members'))

    expect(touchesSet).toHaveLength(0)
  })
})

describe('previewKeywordDiscovery', () => {
  it('reporta seeds resueltas, fórmula y veredicto del gate sin insertar nada', async () => {
    const result = await previewKeywordDiscovery(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.seeds).toHaveLength(2)
    expect(result.estimate.formula).toContain('task setup')
    expect(result.wouldBeAllowed).toBe(true)
    expect(state.calls.some(call => call.sql.includes('INSERT INTO'))).toBe(false)
  })
})
