import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1304 Slice 4 — `readSiteAuditReport` + `readBacklinkProfile`.
 *
 * Invariantes cubiertos: reads SIEMPRE desde PG (cero provider), degradación honesta
 * (`no_data` sin runs/snapshots, `run_not_found` tenant-safe, `query_failed` con
 * captura), findings agrupados por severidad, run `running` reportado como tal, y el
 * shape `{ ok } | { ok: false, errorCode, status }` del mandato parity.
 */

vi.mock('server-only', () => ({}))

const state = {
  target: { organization_id: 'org-1' } as Record<string, unknown> | null,
  runs: [] as Array<Record<string, unknown>>,
  findings: [] as Array<Record<string, unknown>>,
  snapshots: [] as Array<Record<string, unknown>>,
  throwOnQuery: false
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (state.throwOnQuery) {
      throw new Error('boom')
    }

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    if (sql.includes('FROM greenhouse_growth.seo_site_audit_runs')) {
      return state.runs
    }

    if (sql.includes('FROM greenhouse_growth.seo_site_audit_findings')) {
      return state.findings
    }

    if (sql.includes('FROM greenhouse_growth.seo_backlink_snapshots')) {
      return state.snapshots
    }

    return []
  }
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

import { readBacklinkProfile } from '../backlinks/reader'
import { readSiteAuditReport } from '../site-audit/reader'

const runRow = (overrides: Record<string, unknown> = {}) => ({
  audit_run_id: 'seoar-1',
  capture_date: '2026-08-06',
  status: 'succeeded',
  crawled_pages: 42,
  health_score: '87.50',
  started_at: '2026-08-06T10:00:00Z',
  finished_at: '2026-08-06T10:20:00Z',
  ...overrides
})

beforeEach(() => {
  state.target = { organization_id: 'org-1' }
  state.runs = [runRow()]
  state.findings = []
  state.snapshots = []
  state.throwOnQuery = false
})

describe('readSiteAuditReport', () => {
  it('sirve el último run con findings agrupados por severidad', async () => {
    state.findings = [
      { url: 'https://berel.cl/rota', issue_type: 'is_4xx_code', severity: 'critical', detail: { httpStatusCode: 404 } },
      { url: 'https://berel.cl/x', issue_type: 'no_description', severity: 'warning', detail: {} },
      { url: 'https://berel.cl/y', issue_type: 'no_favicon', severity: 'notice', detail: null }
    ]

    const result = await readSiteAuditReport('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.run).toMatchObject({ auditRunId: 'seoar-1', status: 'succeeded', healthScore: 87.5 })
      expect(result.totals).toEqual({ critical: 1, warning: 1, notice: 1 })
      expect(result.findings.critical[0]).toMatchObject({ issueType: 'is_4xx_code' })
      expect(result.findings.notice[0].detail).toEqual({})
    }
  })

  it('run succeeded con 0 findings = reporte de sitio limpio (ok, no error)', async () => {
    const result = await readSiteAuditReport('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.totals).toEqual({ critical: 0, warning: 0, notice: 0 })
    }
  })

  it('run running se reporta como tal (audit en curso, no fabrica health)', async () => {
    state.runs = [runRow({ status: 'running', health_score: null, crawled_pages: null, finished_at: null })]

    const result = await readSiteAuditReport('seot-1')

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.run.status).toBe('running')
      expect(result.run.healthScore).toBeNull()
    }
  })

  it('degradación honesta: sin runs = no_data; run ajeno = run_not_found; error = query_failed', async () => {
    state.runs = []
    expect(await readSiteAuditReport('seot-1')).toEqual({ ok: false, errorCode: 'no_data', status: null })
    expect(await readSiteAuditReport('seot-1', 'seoar-ajeno')).toEqual({
      ok: false,
      errorCode: 'run_not_found',
      status: null
    })

    state.throwOnQuery = true
    expect(await readSiteAuditReport('seot-1')).toEqual({ ok: false, errorCode: 'query_failed', status: null })
  })

  it('target inexistente = target_not_found', async () => {
    state.target = null
    expect(await readSiteAuditReport('seot-x')).toEqual({ ok: false, errorCode: 'target_not_found', status: null })
  })
})

describe('readBacklinkProfile', () => {
  it('sirve la serie con tipos numéricos parseados', async () => {
    state.snapshots = [
      {
        capture_date: '2026-07-30',
        referring_domains: 300,
        backlinks_total: '12000',
        domain_rank: '38.50',
        toxic_share: '0.2200',
        new_lost_delta: { newBacklinks: 10, lostBacklinks: 2, windowDays: 30 }
      },
      {
        capture_date: '2026-08-06',
        referring_domains: 312,
        backlinks_total: '12480',
        domain_rank: '39.00',
        toxic_share: null,
        new_lost_delta: {}
      }
    ]

    const result = await readBacklinkProfile('seot-1', { rangeDays: 30 })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.range).toEqual({ from: '2026-07-08', to: '2026-08-06', days: 30 })
      expect(result.points).toHaveLength(2)
      expect(result.points[0]).toEqual({
        date: '2026-07-30',
        referringDomains: 300,
        backlinksTotal: 12000,
        domainRank: 38.5,
        toxicShare: 0.22,
        newLostDelta: { newBacklinks: 10, lostBacklinks: 2, windowDays: 30 }
      })
      expect(result.points[1].toxicShare).toBeNull()
    }
  })

  it('degradación honesta: serie vacía = no_data (nunca ceros)', async () => {
    expect(await readBacklinkProfile('seot-1')).toEqual({ ok: false, errorCode: 'no_data', status: null })
  })

  it('target inexistente y query rota degradan con su código', async () => {
    state.target = null
    expect(await readBacklinkProfile('seot-x')).toEqual({ ok: false, errorCode: 'target_not_found', status: null })

    state.target = { organization_id: 'org-1' }
    state.throwOnQuery = true
    expect(await readBacklinkProfile('seot-1')).toEqual({ ok: false, errorCode: 'query_failed', status: null })
  })
})
