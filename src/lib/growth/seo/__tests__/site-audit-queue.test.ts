import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1304 Slice 1 — `queueSiteAudit` + `parseOnPageTaskPost` + enqueue batch.
 *
 * Invariantes cubiertos: gate de costo ANTES del provider (y consumiendo cupo de audits),
 * guard anti doble-encolado sin gasto (`running` en vuelo / `succeeded` de hoy),
 * `failed` de hoy NO bloquea reintento, persistencia `status=running` + `provider_task_id`,
 * HTTP 200 con status_code de task inválido = provider_error, breaker abierto declarado,
 * y per-target resilience del batch. PG mockeado con routing por SQL (patrón TASK-1303).
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
  existingRuns: [] as Array<{ status: string; capture_date: string }>,
  eligibleTargets: [] as Array<{ seo_target_id: string; organization_id: string }>,
  inserts: [] as SqlCall[],
  sqlLog: [] as SqlCall[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    state.sqlLog.push({ sql, params })

    if (sql.includes('FROM greenhouse_growth.seo_targets t') && sql.includes('module_assignments')) {
      return state.eligibleTargets
    }

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('FROM greenhouse_growth.seo_site_audit_runs')) {
      return state.existingRuns
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_site_audit_runs')) {
      state.inserts.push({ sql, params })

      return [{ audit_run_id: 'seoar-test-1' }]
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

import { runSiteAuditEnqueueBatch } from '../site-audit/enqueue-batch'
import {
  ONPAGE_TASK_POST_ENDPOINT,
  SITE_AUDIT_ESTIMATED_COST_USD,
  SITE_AUDIT_MAX_CRAWL_PAGES,
  parseOnPageTaskPost,
  queueSiteAudit
} from '../site-audit/queue-audit'

const allowedGate = {
  allowed: true,
  tier: 'contracted',
  allowanceRemaining: 8,
  budgetRemainingUsd: 40,
  blockedReason: null
}

const taskPostResponse = (options: { id?: string | null; statusCode?: number; cost?: number } = {}) => ({
  ok: true,
  httpStatus: 200,
  endpoint: ONPAGE_TASK_POST_ENDPOINT,
  cost: options.cost ?? 0.015,
  latencyMs: 10,
  secretSource: 'env',
  tasks: [
    {
      id: options.id === undefined ? 'task-provider-1' : options.id,
      status_code: options.statusCode ?? 20100
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
  state.existingRuns = []
  state.eligibleTargets = []
  state.inserts = []
  state.sqlLog = []

  gateMock.mockReset()
  gateMock.mockResolvedValue(allowedGate)
  providerMock.mockReset()
  providerMock.mockResolvedValue(taskPostResponse())
  outboxMock.mockReset()
  outboxMock.mockResolvedValue('outbox-1')
})

describe('parseOnPageTaskPost', () => {
  it('extrae el task id cuando el status_code es 20100 (created)', () => {
    expect(parseOnPageTaskPost([{ id: 'abc', status_code: 20100 }])).toEqual({
      providerTaskId: 'abc',
      statusCode: 20100
    })
  })

  it('rechaza tasks con status_code de error aunque el HTTP haya sido 200', () => {
    expect(parseOnPageTaskPost([{ id: 'abc', status_code: 40501 }])).toEqual({
      providerTaskId: null,
      statusCode: 40501
    })
  })

  it('tolera respuestas sin tasks', () => {
    expect(parseOnPageTaskPost([])).toEqual({ providerTaskId: null, statusCode: null })
  })
})

describe('queueSiteAudit', () => {
  it('encola la task OnPage y persiste el run en running con provider_task_id', async () => {
    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result).toMatchObject({
      ok: true,
      auditRunId: 'seoar-test-1',
      providerTaskId: 'task-provider-1',
      status: 'running',
      captureDate: '2026-08-06'
    })

    // El gate corre ANTES del provider y consume cupo de audits (sin consumesAuditAllowance:false).
    expect(gateMock).toHaveBeenCalledWith('org-1', {
      estimatedCostUsd: SITE_AUDIT_ESTIMATED_COST_USD
    })
    expect(providerMock).toHaveBeenCalledTimes(1)

    const providerInput = providerMock.mock.calls[0][0] as {
      family: string
      endpoint: string
      tasks: Array<Record<string, unknown>>
      organizationId: string
    }

    expect(providerInput.family).toBe('onpage')
    expect(providerInput.organizationId).toBe('org-1')
    expect(providerInput.tasks[0]).toMatchObject({
      target: 'berel.cl',
      max_crawl_pages: SITE_AUDIT_MAX_CRAWL_PAGES,
      validate_micromarkup: true
    })

    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0].params).toContain('task-provider-1')

    expect(outboxMock).toHaveBeenCalledTimes(1)
    expect(outboxMock.mock.calls[0][0]).toMatchObject({
      eventType: 'growth.seo.site_audit.queued',
      aggregateId: 'seot-1'
    })
  })

  it('bloquea sin gasto cuando hay una task en vuelo (audit_already_running)', async () => {
    state.existingRuns = [{ status: 'running', capture_date: '2026-08-05' }]

    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'audit_already_running', status: null })
    expect(gateMock).not.toHaveBeenCalled()
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('bloquea sin gasto cuando hoy ya hay un audit exitoso (already_captured_today)', async () => {
    state.existingRuns = [{ status: 'succeeded', capture_date: '2026-08-06' }]

    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'already_captured_today', status: null })
    expect(providerMock).not.toHaveBeenCalled()
  })

  it('un failed de hoy NO bloquea el reintento', async () => {
    // El pre-check solo trae running o succeeded-de-hoy; un failed no aparece en el SELECT.
    state.existingRuns = []

    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result.ok).toBe(true)
  })

  it('propaga el bloqueo del gate sin llamar al provider', async () => {
    gateMock.mockResolvedValue({
      allowed: false,
      tier: 'trial',
      allowanceRemaining: 0,
      budgetRemainingUsd: 2,
      blockedReason: 'quota_exhausted'
    })

    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'quota_exhausted', status: null })
    expect(providerMock).not.toHaveBeenCalled()
    expect(state.inserts).toHaveLength(0)
  })

  it('declara breaker_open cuando la familia onpage está abierta', async () => {
    providerMock.mockResolvedValue({
      ok: false,
      httpStatus: 0,
      endpoint: ONPAGE_TASK_POST_ENDPOINT,
      tasks: [],
      cost: null,
      latencyMs: 0,
      secretSource: 'unconfigured',
      breakerOpen: true
    })

    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'breaker_open', status: null })
    expect(state.inserts).toHaveLength(0)
  })

  it('HTTP 200 con status_code de task inválido = provider_error (HTTP 200 ≠ éxito)', async () => {
    providerMock.mockResolvedValue(taskPostResponse({ id: null, statusCode: 40501 }))

    const result = await queueSiteAudit('seot-1', 'user-1')

    expect(result).toEqual({ ok: false, errorCode: 'provider_error', status: null })
    expect(state.inserts).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('target inexistente o inactivo degrada honesto', async () => {
    state.target = null
    expect(await queueSiteAudit('seot-x', 'user-1')).toEqual({
      ok: false,
      errorCode: 'target_not_found',
      status: null
    })

    state.target = { seo_target_id: 'seot-1', organization_id: 'org-1', root_domain: 'berel.cl', status: 'paused' }
    expect(await queueSiteAudit('seot-1', 'user-1')).toEqual({
      ok: false,
      errorCode: 'target_not_active',
      status: null
    })
  })
})

describe('runSiteAuditEnqueueBatch', () => {
  it('per-target resilience: un target bloqueado no impide encolar el resto', async () => {
    state.eligibleTargets = [
      { seo_target_id: 'seot-1', organization_id: 'org-1' },
      { seo_target_id: 'seot-2', organization_id: 'org-2' }
    ]

    // seot-1 bloqueado por cupo; seot-2 encola OK.
    gateMock
      .mockResolvedValueOnce({
        allowed: false,
        tier: 'trial',
        allowanceRemaining: 0,
        budgetRemainingUsd: 2,
        blockedReason: 'quota_exhausted'
      })
      .mockResolvedValueOnce(allowedGate)

    const summary = await runSiteAuditEnqueueBatch()

    expect(summary.targets).toBe(2)
    expect(summary.blocked).toBe(1)
    expect(summary.queued).toBe(1)
    expect(summary.outcomes[0]).toMatchObject({ seoTargetId: 'seot-1', status: 'blocked', errorCode: 'quota_exhausted' })
    expect(summary.outcomes[1]).toMatchObject({ seoTargetId: 'seot-2', status: 'queued' })
  })

  it('clasifica idempotencia como skipped (sin gasto)', async () => {
    state.eligibleTargets = [{ seo_target_id: 'seot-1', organization_id: 'org-1' }]
    state.existingRuns = [{ status: 'running', capture_date: '2026-08-05' }]

    const summary = await runSiteAuditEnqueueBatch()

    expect(summary.skipped).toBe(1)
    expect(summary.costUsd).toBe(0)
  })
})
