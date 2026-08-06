import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1304 Slice 2 — `collectSiteAuditRuns` (poll idempotente) + parsers + findings map.
 *
 * Invariantes cubiertos: poll sobre task incompleta = no-op (el run queda `running`),
 * claim SKIP LOCKED = un solo materializador (el segundo collect ve la fila lockeada y
 * hace skip), crawl OK con 0 findings = `succeeded` (NUNCA fallo), 0 páginas = `failed`,
 * `extended_crawl_status` con error = `degraded`, task colgada > techo = `failed`
 * (gave_up), y pages fetch fallido deja el run `running` para reintento (nunca un run
 * cerrado con findings a medias). UPDATE + findings + outbox comparten transacción.
 */

vi.mock('server-only', () => ({}))

interface SqlCall {
  sql: string
  params: unknown[]
}

const state = {
  pendingRuns: [] as Array<{ audit_run_id: string }>,
  claimRow: null as Record<string, unknown> | null,
  txCalls: [] as SqlCall[],
  updates: [] as SqlCall[],
  findingInserts: [] as SqlCall[]
}

const fakeClient = {
  query: async (sql: string, params: unknown[] = []) => {
    state.txCalls.push({ sql, params })

    if (sql.includes('FOR UPDATE OF r SKIP LOCKED')) {
      return { rows: state.claimRow ? [state.claimRow] : [] }
    }

    if (sql.includes('UPDATE greenhouse_growth.seo_site_audit_runs')) {
      state.updates.push({ sql, params })

      return { rows: [] }
    }

    if (sql.includes('INSERT INTO greenhouse_growth.seo_site_audit_findings')) {
      state.findingInserts.push({ sql, params })

      return { rows: [] }
    }

    return { rows: [] }
  }
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (sql.includes("status = 'running'")) {
      return state.pendingRuns
    }

    return []
  },
  withGreenhousePostgresTransaction: async (callback: (client: unknown) => Promise<unknown>) =>
    callback(fakeClient)
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

import {
  collectSiteAuditRuns,
  deriveAuditRunStatus,
  parseOnPagePages,
  parseOnPageSummary
} from '../site-audit/collect'
import { mapOnPagePageToFindings } from '../site-audit/findings-map'

const claimedRun = (overrides: Record<string, unknown> = {}) => ({
  audit_run_id: 'seoar-1',
  seo_target_id: 'seot-1',
  organization_id: 'org-1',
  capture_date: '2026-08-06',
  provider_task_id: 'task-1',
  gave_up: false,
  ...overrides
})

const summaryResponse = (options: {
  progress?: string
  pagesCrawled?: number
  onpageScore?: number
  extended?: string | null
} = {}) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/on_page/summary/task-1',
  cost: 0,
  latencyMs: 5,
  secretSource: 'env',
  tasks: [
    {
      status_code: 20000,
      result: [
        {
          crawl_progress: options.progress ?? 'finished',
          crawl_status: { pages_crawled: options.pagesCrawled ?? 12 },
          extended_crawl_status: options.extended === undefined ? 'no_errors' : options.extended,
          page_metrics: { onpage_score: options.onpageScore ?? 87.5 }
        }
      ]
    }
  ]
})

const pagesResponse = (items: unknown[]) => ({
  ok: true,
  httpStatus: 200,
  endpoint: '/v3/on_page/pages',
  cost: 0,
  latencyMs: 5,
  secretSource: 'env',
  tasks: [{ status_code: 20000, result: [{ items }] }]
})

beforeEach(() => {
  state.pendingRuns = [{ audit_run_id: 'seoar-1' }]
  state.claimRow = claimedRun()
  state.txCalls = []
  state.updates = []
  state.findingInserts = []

  providerMock.mockReset()
  outboxMock.mockReset()
  outboxMock.mockResolvedValue('outbox-1')
})

describe('parsers puros', () => {
  it('parseOnPageSummary extrae progreso, páginas, score y estado extendido', () => {
    const summary = parseOnPageSummary(summaryResponse({ pagesCrawled: 40, onpageScore: 91.2 }).tasks)

    expect(summary).toEqual({
      crawlProgress: 'finished',
      pagesCrawled: 40,
      onpageScore: 91.2,
      extendedCrawlStatus: 'no_errors',
      statusCode: 20000
    })
  })

  it('parseOnPagePages aplana los items de la task', () => {
    const items = [{ url: 'https://a.cl/' }, { url: 'https://a.cl/b' }]

    expect(parseOnPagePages(pagesResponse(items).tasks)).toEqual(items)
  })

  it('deriveAuditRunStatus: mapeo honesto explícito', () => {
    expect(
      deriveAuditRunStatus({ crawlProgress: 'finished', pagesCrawled: 10, onpageScore: 90, extendedCrawlStatus: 'no_errors', statusCode: 20000 })
    ).toBe('succeeded')

    expect(
      deriveAuditRunStatus({ crawlProgress: 'finished', pagesCrawled: 10, onpageScore: 90, extendedCrawlStatus: 'invalid_page_status_code', statusCode: 20000 })
    ).toBe('degraded')

    expect(
      deriveAuditRunStatus({ crawlProgress: 'finished', pagesCrawled: 0, onpageScore: null, extendedCrawlStatus: 'site_unreachable', statusCode: 20000 })
    ).toBe('failed')
  })
})

describe('mapOnPagePageToFindings', () => {
  it('mapea solo checks true=problema con su severidad y contexto', () => {
    const findings = mapOnPagePageToFindings({
      url: 'https://berel.cl/rota',
      onpage_score: 55.1,
      status_code: 404,
      checks: {
        is_4xx_code: true,
        no_description: true,
        is_https: true, // check positivo: NUNCA debe mapearse como problema
        no_favicon: false
      }
    })

    expect(findings).toEqual([
      {
        url: 'https://berel.cl/rota',
        issueType: 'is_4xx_code',
        severity: 'critical',
        detail: { onpageScore: 55.1, httpStatusCode: 404 }
      },
      {
        url: 'https://berel.cl/rota',
        issueType: 'no_description',
        severity: 'warning',
        detail: { onpageScore: 55.1, httpStatusCode: 404 }
      }
    ])
  })

  it('página limpia = cero findings', () => {
    expect(
      mapOnPagePageToFindings({ url: 'https://berel.cl/', checks: { is_https: true, canonical: true } })
    ).toEqual([])
  })
})

describe('collectSiteAuditRuns', () => {
  it('task incompleta = no-op honesto (el run queda running, cero findings)', async () => {
    providerMock.mockResolvedValue(summaryResponse({ progress: 'in_progress' }))

    const summary = await collectSiteAuditRuns()

    expect(summary.inProgress).toBe(1)
    expect(summary.materialized).toBe(0)
    expect(state.updates).toHaveLength(0)
    expect(state.findingInserts).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })

  it('claim lockeado por otro proceso = skip sin tocar el provider', async () => {
    state.claimRow = null

    const summary = await collectSiteAuditRuns()

    expect(summary.claimedElsewhere).toBe(1)
    expect(providerMock).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
  })

  it('crawl OK con 0 findings = succeeded (sitio limpio, nunca fallo)', async () => {
    providerMock
      .mockResolvedValueOnce(summaryResponse({ pagesCrawled: 8 }))
      .mockResolvedValueOnce(pagesResponse([{ url: 'https://berel.cl/', checks: { is_https: true } }]))

    const summary = await collectSiteAuditRuns()

    expect(summary.materialized).toBe(1)
    expect(summary.outcomes[0]).toMatchObject({ finalStatus: 'succeeded', findings: 0 })
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0].params).toContain('succeeded')
    expect(state.findingInserts).toHaveLength(0)

    expect(outboxMock).toHaveBeenCalledTimes(1)
    expect(outboxMock.mock.calls[0][0]).toMatchObject({
      eventType: 'growth.seo.site_audit.completed',
      payload: expect.objectContaining({ status: 'succeeded', findingsCount: 0 })
    })

    // El outbox se publica DENTRO de la transacción del claim (client como 2º arg).
    expect(outboxMock.mock.calls[0][1]).toBe(fakeClient)
  })

  it('crawl con findings los materializa en la misma transacción', async () => {
    providerMock
      .mockResolvedValueOnce(summaryResponse({ pagesCrawled: 8, extended: 'no_errors' }))
      .mockResolvedValueOnce(
        pagesResponse([
          { url: 'https://berel.cl/rota', checks: { is_4xx_code: true } },
          { url: 'https://berel.cl/sin-desc', checks: { no_description: true } }
        ])
      )

    const summary = await collectSiteAuditRuns()

    expect(summary.outcomes[0]).toMatchObject({ finalStatus: 'succeeded', findings: 2 })
    expect(state.findingInserts).toHaveLength(2)
    expect(state.findingInserts[0].params).toEqual([
      'seoar-1',
      'https://berel.cl/rota',
      'is_4xx_code',
      'critical',
      expect.any(String)
    ])
  })

  it('crawl terminado con 0 páginas = failed sin leer pages', async () => {
    providerMock.mockResolvedValueOnce(summaryResponse({ pagesCrawled: 0, extended: 'site_unreachable' }))

    const summary = await collectSiteAuditRuns()

    expect(summary.outcomes[0]).toMatchObject({ finalStatus: 'failed', findings: 0 })
    expect(providerMock).toHaveBeenCalledTimes(1)
    expect(state.updates[0].params).toContain('failed')
  })

  it('extended_crawl_status con error y páginas > 0 = degraded', async () => {
    providerMock
      .mockResolvedValueOnce(summaryResponse({ pagesCrawled: 5, extended: 'invalid_page_status_code' }))
      .mockResolvedValueOnce(pagesResponse([]))

    const summary = await collectSiteAuditRuns()

    expect(summary.outcomes[0]).toMatchObject({ finalStatus: 'degraded' })
  })

  it('task colgada más allá del techo = failed (gave_up) aunque siga in_progress', async () => {
    state.claimRow = claimedRun({ gave_up: true })
    providerMock.mockResolvedValue(summaryResponse({ progress: 'in_progress' }))

    const summary = await collectSiteAuditRuns()

    expect(summary.gaveUp).toBe(1)
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0].sql).toContain("'failed'")
    expect(outboxMock.mock.calls[0][0].payload).toMatchObject({ status: 'failed', gaveUpAfterHours: 24 })
  })

  it('pages fetch fallido deja el run running (reintento, nunca findings a medias)', async () => {
    providerMock
      .mockResolvedValueOnce(summaryResponse({ pagesCrawled: 8 }))
      .mockResolvedValueOnce({
        ok: false,
        httpStatus: 500,
        endpoint: '/v3/on_page/pages',
        tasks: [],
        cost: null,
        latencyMs: 5,
        secretSource: 'env',
        breakerOpen: false
      })

    const summary = await collectSiteAuditRuns()

    expect(summary.pollFailed).toBe(1)
    expect(state.updates).toHaveLength(0)
    expect(state.findingInserts).toHaveLength(0)
    expect(outboxMock).not.toHaveBeenCalled()
  })
})
