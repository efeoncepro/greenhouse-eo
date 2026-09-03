import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1806 Slice 1 — Ejecutor bounded del shadow legacy/improved.
 *
 * Cubre las decisiones que hacen que el shadow gaste bien o no gaste: gate OFF → cero llamadas;
 * orden improved→legacy dentro de la celda; tasks byte-idénticos salvo el flag (hash igual);
 * parada dura por caps; `already_captured` sin llamada; aborto ante fallo de ambas fórmulas;
 * la celda prospecto NO persiste; y los cuatro campos de provenance llegan al writer.
 *
 * El SQL real (pre-checks) se ejercita contra PG con el CLI en `--dry-run` (los mocks ejercitan el TS).
 */

vi.mock('server-only', () => ({}))

const providerMock = vi.fn()
const queryMock = vi.fn()
const gateMock = vi.fn()
const persistDomainMock = vi.fn()
const persistUrlMock = vi.fn()

vi.mock('@/lib/ai/dataforseo', () => ({
  postDataForSeoTask: (...args: unknown[]) => providerMock(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('../../entitlement', () => ({
  SEO_MODULE_KEY: 'seo_v2',
  SEO_MODULE_KEYS_READ: ['seo_v2'],
  enforceSeoRunEntitlement: (...args: unknown[]) => gateMock(...args)
}))

vi.mock('../../domain-overview/persist', async importOriginal => ({
  ...((await importOriginal()) as Record<string, unknown>),
  persistDomainOverviewSnapshots: (...args: unknown[]) => persistDomainMock(...args)
}))

vi.mock('../../url-visibility/persist', async importOriginal => ({
  ...((await importOriginal()) as Record<string, unknown>),
  persistUrlVisibilitySnapshots: (...args: unknown[]) => persistUrlMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import { resolveEtvEvaluatorConfig } from '../evaluator'
import { assertEtvShadowCohort, hashProviderTaskWithoutFlag, runEtvShadow, type EtvShadowCohort } from '../shadow-runner'

const NOW = new Date('2026-10-15T12:00:00.000Z')
const ORG_EFEONCE = 'org-efeonce'
const ORG_BEREL = 'org-berel'

const ON_CONFIG = resolveEtvEvaluatorConfig({
  GROWTH_SEO_ETV_EVALUATOR_ENABLED: 'true',
  GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST: 'efeoncepro.com,berel.com',
  GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS: '30',
  GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD: '2'
} as unknown as NodeJS.ProcessEnv)

const OFF_CONFIG = resolveEtvEvaluatorConfig({} as NodeJS.ProcessEnv)

const cohort = (cells: EtvShadowCohort['cells']): EtvShadowCohort =>
  assertEtvShadowCohort({
    id: 'test-cohort',
    approvedBy: 'test',
    approvedAt: '2026-09-03T02:40:00Z',
    organizations: { 'efeoncepro.com': ORG_EFEONCE, 'berel.com': ORG_BEREL },
    cells
  })

const DOMAIN_CELL = { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' as const, organizationId: ORG_EFEONCE }
const VISIBILITY_CELL = { subject: 'berel.com', locationCode: '2484', languageCode: 'es', familySlug: 'ranked_keywords' as const, rowLimit: 100, organizationId: ORG_BEREL }

const PROSPECT_CELL = {
  subject: 'berel.com',
  locationCode: '2484',
  languageCode: 'es',
  familySlug: 'ranked_keywords' as const,
  rowLimit: 1000,
  purpose: 'prospect' as const,
  organizationId: ORG_BEREL
}

const okResponse = (task: Record<string, unknown>, result: unknown[], cost = 0.01212) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/dataforseo_labs/google/x/live',
  cost,
  latencyMs: 120,
  secretSource: 'env',
  tasks: [{ status_code: 20000, data: task, result }]
})

const domainResult = [{ items: [{ metrics: { organic: { count: 5, etv: 5.2, pos_1: 1 }, paid: { count: 0, etv: 0 } } }] }]

const rankedResult = (etvs: number[]) => [
  {
    total_count: etvs.length,
    metrics: { organic: { count: etvs.length, etv: etvs.reduce((sum, value) => sum + value, 0) } },
    items: etvs.map((etv, index) => ({
      keyword_data: { keyword: `kw ${index}`, keyword_info: { search_volume: 100 } },
      ranked_serp_element: { serp_item: { type: 'organic', rank_group: index + 1, etv } }
    }))
  }
]

const artifacts = new Map<string, string>()

const deps = {
  writeArtifact: async (relativePath: string, content: string) => {
    artifacts.set(relativePath, content)
  }
}

const run = (input: { cells: EtvShadowCohort['cells']; config?: typeof ON_CONFIG }) =>
  runEtvShadow({ cohort: cohort(input.cells), config: input.config ?? ON_CONFIG, mode: 'exact_ab', now: NOW, artifactDir: '/tmp/etv-shadow-test', deps })

const providerTasks = () => providerMock.mock.calls.map(call => (call[0] as { tasks: Array<Record<string, unknown>> }).tasks[0])

beforeEach(() => {
  artifacts.clear()
  providerMock.mockReset()
  queryMock.mockReset()
  gateMock.mockReset()
  persistDomainMock.mockReset()
  persistUrlMock.mockReset()

  // Default: sin UNIQUE legacy, sin evidencia del día, gate permitido, writers cuentan filas.
  queryMock.mockResolvedValue([])
  gateMock.mockResolvedValue({ allowed: true, tier: 'contracted', allowanceRemaining: 8, budgetRemainingUsd: 50, blockedReason: null })
  persistDomainMock.mockImplementation(async (input: { snapshots: unknown[] }) => ({ rowsWritten: input.snapshots.length }))
  persistUrlMock.mockImplementation(async (input: { snapshots: unknown[] }) => ({ rowsWritten: input.snapshots.length }))

  providerMock.mockImplementation(async (input: { endpoint: string; tasks: Array<Record<string, unknown>> }) => {
    const task = input.tasks[0]

    if (input.endpoint.includes('domain_rank_overview')) return okResponse(task, domainResult)
    if (input.endpoint.includes('ranked_keywords')) return okResponse(task, rankedResult([50, 30, 20]), 0.024)

    return okResponse(task, [])
  })
})

describe('TASK-1806 — cohorte fail-closed', () => {
  it('un sujeto sin organización declarada no planifica (y por tanto no gasta)', () => {
    expect(() =>
      assertEtvShadowCohort({
        id: 'x',
        approvedBy: 'op',
        approvedAt: '2026-09-03T00:00:00Z',
        organizations: { 'berel.com': ORG_BEREL },
        cells: [{ ...DOMAIN_CELL }]
      })
    ).toThrowError(/sin organización declarada/)
  })

  it('la celda prospecto exige ranked_keywords con el limit del diagnóstico', () => {
    expect(() => cohort([{ ...PROSPECT_CELL, rowLimit: 100 }])).toThrowError(/limit del diagnóstico/)
  })
})

describe('TASK-1806 — gates antes de la primera llamada', () => {
  it('(a) gate OFF → executed=false con razones y CERO llamadas al proveedor', async () => {
    const summary = await run({ cells: [DOMAIN_CELL], config: OFF_CONFIG })

    expect(summary.executed).toBe(false)
    expect(summary.reasons).toEqual(expect.arrayContaining([expect.stringContaining('GROWTH_SEO_ETV_EVALUATOR_ENABLED está OFF')]))
    expect(providerMock).not.toHaveBeenCalled()
    expect(persistDomainMock).not.toHaveBeenCalled()
    expect(JSON.parse(artifacts.get('summary.json') ?? '{}')).toMatchObject({ executed: false, totals: { requests: 0, costUsd: 0 } })
  })

  it('la UNIQUE legacy presente (contract no aplicado) aborta ANTES de la primera llamada', async () => {
    queryMock.mockImplementation(async (sql: string) => (sql.includes('pg_constraint') ? [{ conname: 'seo_domain_overview_capture_unique' }] : []))

    const summary = await run({ cells: [DOMAIN_CELL] })

    expect(summary.executed).toBe(false)
    expect(summary.reasons).toEqual(expect.arrayContaining([expect.stringContaining('seo_domain_overview_capture_unique')]))
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('entitlement bloqueado por organización → no ejecuta', async () => {
    gateMock.mockResolvedValue({ allowed: false, tier: 'trial', allowanceRemaining: 0, budgetRemainingUsd: 0, blockedReason: 'budget_exhausted' })

    const summary = await run({ cells: [DOMAIN_CELL] })

    expect(summary.executed).toBe(false)
    expect(summary.reasons).toEqual(expect.arrayContaining([expect.stringContaining(`entitlement bloqueado para ${ORG_EFEONCE}: budget_exhausted`)]))
    expect(gateMock).toHaveBeenCalledWith(ORG_EFEONCE, { estimatedCostUsd: 0.02424, consumesAuditAllowance: false })
    expect(providerMock).not.toHaveBeenCalled()
  })
})

describe('TASK-1806 — ejecución', () => {
  it('(b) dentro de la celda va improved PRIMERO y legacy DESPUÉS', async () => {
    const summary = await run({ cells: [DOMAIN_CELL] })

    expect(summary.executed).toBe(true)
    expect(summary.totals).toMatchObject({ requests: 2, aborted: false, abortReason: null })
    expect(providerTasks().map(task => task.use_improved_etv)).toEqual([true, false])
    expect(summary.requests.map(request => request.methodology)).toEqual(['improved_layout_clickstream_v2', 'legacy_static_v1'])
  })

  it('(c) los dos tasks son idénticos salvo `use_improved_etv` (mismo hash sin el flag)', async () => {
    const summary = await run({ cells: [DOMAIN_CELL] })
    const [improved, legacy] = providerTasks()

    expect({ ...improved, use_improved_etv: undefined }).toEqual({ ...legacy, use_improved_etv: undefined })
    expect(improved).toMatchObject({ target: 'efeoncepro.com', location_code: 2152, language_code: 'es', limit: 1 })
    expect(summary.requests[0].taskHashWithoutFlag).toBe(summary.requests[1].taskHashWithoutFlag)
    expect(hashProviderTaskWithoutFlag(improved)).toBe(hashProviderTaskWithoutFlag(legacy))
    expect(hashProviderTaskWithoutFlag({ target: 'a' })).not.toBe(hashProviderTaskWithoutFlag({ target: 'b' }))
  })

  it('(d) el tope USD detiene ANTES de la llamada que lo excedería y aborta la corrida completa', async () => {
    // Forecast 0.02424 cabe en 0.03 (pasa el dry-run), pero la primera llamada cuesta más de lo
    // estimado: 0.02 real + 0.01212 estimado de la segunda > 0.03 → se detiene ANTES de llamar.
    providerMock.mockImplementation(async (input: { tasks: Array<Record<string, unknown>> }) => okResponse(input.tasks[0], domainResult, 0.02))

    const summary = await run({ cells: [DOMAIN_CELL], config: { ...ON_CONFIG, budgetUsd: 0.03 } })

    expect(providerMock).toHaveBeenCalledTimes(1)
    expect(summary.totals).toMatchObject({ requests: 1, costUsd: 0.02, aborted: true, abortReason: 'budget_cap' })
    expect(summary.requests.map(request => request.status)).toEqual(['executed', 'skipped_after_abort'])
    expect(summary.requests[1].errorCode).toBe('budget_cap')
    expect(summary.reasons[0]).toContain('budget_cap')
  })

  it('(d) el máximo de requests se rechaza en el preflight (dry-run fail-closed)', async () => {
    const summary = await run({ cells: [DOMAIN_CELL], config: { ...ON_CONFIG, maxRequests: 1 } })

    expect(summary.executed).toBe(false)
    expect(summary.reasons).toEqual(expect.arrayContaining([expect.stringContaining('requests 2 > máximo 1')]))
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('(e) una (celda, fórmula) con fila del día queda `already_captured` y no llama', async () => {
    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) =>
      sql.includes('FROM greenhouse_growth.seo_domain_overview_snapshots') && params[4] === 'improved_layout_clickstream_v2'
        ? [{ normalized_domain: 'efeoncepro.com' }]
        : []
    )

    const summary = await run({ cells: [DOMAIN_CELL] })

    expect(summary.executed).toBe(true)
    expect(providerMock).toHaveBeenCalledTimes(1)
    expect(providerTasks()[0].use_improved_etv).toBe(false)
    expect(summary.requests.map(request => [request.methodology, request.status, request.costUsd])).toEqual([
      ['improved_layout_clickstream_v2', 'already_captured', 0],
      ['legacy_static_v1', 'executed', 0.01212]
    ])
  })

  it('(f) `status_code != 20000` en AMBAS fórmulas de una celda aborta la corrida (la evidencia queda en el crudo)', async () => {
    providerMock.mockImplementation(async (input: { tasks: Array<Record<string, unknown>> }) => ({
      ...okResponse(input.tasks[0], []),
      tasks: [{ status_code: 40501, data: input.tasks[0], result: [] }]
    }))

    const summary = await run({ cells: [DOMAIN_CELL, VISIBILITY_CELL] })

    expect(providerMock).toHaveBeenCalledTimes(2)
    expect(summary.totals).toMatchObject({ requests: 2, aborted: true, abortReason: 'provider_status_both_formulas' })
    expect(summary.requests.slice(0, 2).every(request => !request.ok && request.errorCode === 'task_status_40501')).toBe(true)
    expect(summary.requests.slice(2).every(request => request.status === 'skipped_after_abort')).toBe(true)
    expect(persistDomainMock).not.toHaveBeenCalled()
    expect(artifacts.has('raw/0-improved_layout_clickstream_v2.json')).toBe(true)
    expect(artifacts.has('raw/0-legacy_static_v1.json')).toBe(true)
  })

  it('una sola fórmula caída invalida la celda pero NO aborta: la otra se persiste', async () => {
    providerMock.mockImplementation(async (input: { tasks: Array<Record<string, unknown>> }) =>
      input.tasks[0].use_improved_etv === true
        ? { ...okResponse(input.tasks[0], []), tasks: [{ status_code: 40501, result: [] }] }
        : okResponse(input.tasks[0], domainResult)
    )

    const summary = await run({ cells: [DOMAIN_CELL] })

    expect(summary.totals).toMatchObject({ requests: 2, aborted: false })
    expect(summary.requests.map(request => request.ok)).toEqual([false, true])
    expect(persistDomainMock).toHaveBeenCalledTimes(1)
  })

  it('(g) la celda prospecto NO persiste: deriva la suma orgánica y la reporta en el summary', async () => {
    const summary = await run({ cells: [PROSPECT_CELL] })

    expect(summary.executed).toBe(true)
    expect(persistUrlMock).not.toHaveBeenCalled()
    expect(persistDomainMock).not.toHaveBeenCalled()
    expect(providerTasks()[0]).toMatchObject({ target: 'berel.com', limit: 1000, item_types: ['organic', 'ai_overview_reference'], load_rank_absolute: true })

    for (const request of summary.requests) {
      expect(request.purpose).toBe('prospect')
      expect(request.persisted).toEqual({ table: null, rows: 0, conflict: false })
      expect(request.prospectTraffic).toEqual({ sum: 100, sampleRows: 3, rowLimit: 1000, truncated: false })
    }
  })

  it('la celda de visibilidad SÍ persiste con el writer canónico (subject_kind domain)', async () => {
    const summary = await run({ cells: [VISIBILITY_CELL] })

    expect(persistUrlMock).toHaveBeenCalledTimes(2)
    expect(persistUrlMock.mock.calls[0][0]).toMatchObject({
      capturedByOrganizationId: ORG_BEREL,
      providerCostUsd: 0.024,
      snapshots: [{ subjectKind: 'domain', normalizedSubject: 'berel.com', sourceEndpoint: 'ranked_keywords', totalRankedKeywords: 3 }]
    })
    expect(summary.requests.map(request => request.persisted)).toEqual([
      { table: 'seo_url_visibility_snapshots', rows: 1, conflict: false },
      { table: 'seo_url_visibility_snapshots', rows: 1, conflict: false }
    ])
  })

  it('(h) los cuatro campos de provenance llegan al writer, por fórmula', async () => {
    await run({ cells: [DOMAIN_CELL] })

    expect(persistDomainMock).toHaveBeenCalledTimes(2)

    const stamps = persistDomainMock.mock.calls.map(call => (call[0] as { snapshots: Array<{ etvMethodology: unknown }> }).snapshots[0].etvMethodology)

    expect(stamps).toEqual([
      { version: 'improved_layout_clickstream_v2', evidence: 'explicit_request', requestedAt: NOW.toISOString(), policyVersion: 'etv-policy.v1', historicalBasis: null },
      { version: 'legacy_static_v1', evidence: 'explicit_request', requestedAt: NOW.toISOString(), policyVersion: 'etv-policy.v1', historicalBasis: null }
    ])
  })

  it('el summary.json y los crudos quedan escritos, sin credenciales', async () => {
    const summary = await run({ cells: [DOMAIN_CELL] })
    const written = JSON.parse(artifacts.get('summary.json') ?? '{}')

    expect(written).toMatchObject({ runId: summary.runId, cohortId: 'test-cohort', mode: 'exact_ab', policyVersion: 'etv-policy.v1', caps: { maxRequests: 30, budgetUsd: 2 } })
    expect(written.plan).toBeUndefined()
    expect(summary.requests.map(request => request.rawFile)).toEqual(['raw/0-improved_layout_clickstream_v2.json', 'raw/0-legacy_static_v1.json'])

    const raw = JSON.parse(artifacts.get('raw/0-legacy_static_v1.json') ?? '{}')

    expect(raw.response.secretSource).toBeUndefined()
    expect(raw.task.use_improved_etv).toBe(false)
  })
})
