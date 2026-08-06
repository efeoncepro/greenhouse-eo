import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1304 Slice 4 — signal `seo.audit.stuck_tasks`: severity matrix (ok = cero
 * colgados / warning ≥6h / error ≥30h = el collect mismo no corre), steady=0 y
 * degradación `unknown` observada en fallo. Date-math por intervalos TIMESTAMPTZ
 * (nunca EXTRACT EPOCH de DATE-DATE, gate TASK-893).
 */

vi.mock('server-only', () => ({}))

const state = {
  rows: [] as Array<{ audit_run_id: string; seo_target_id: string; is_warn: boolean; is_error: boolean }>,
  sql: '',
  params: [] as unknown[],
  fail: false
}

vi.mock('@/lib/db', () => ({
  query: async (sql: string, params: unknown[] = []) => {
    state.sql = sql
    state.params = params

    if (state.fail) throw new Error('pg down')

    return state.rows
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  SEO_AUDIT_STUCK_ERROR_HOURS,
  SEO_AUDIT_STUCK_TASKS_SIGNAL_ID,
  SEO_AUDIT_STUCK_WARN_HOURS,
  getSeoAuditStuckTasksSignal
} from '../seo-audit-stuck-tasks'

beforeEach(() => {
  state.rows = []
  state.sql = ''
  state.params = []
  state.fail = false
})

describe('getSeoAuditStuckTasksSignal', () => {
  it('steady: sin runs en vuelo o dentro de la ventana normal → ok', async () => {
    const empty = await getSeoAuditStuckTasksSignal()

    expect(empty.signalId).toBe(SEO_AUDIT_STUCK_TASKS_SIGNAL_ID)
    expect(empty.severity).toBe('ok')

    state.rows = [{ audit_run_id: 'seoar-1', seo_target_id: 'seot-1', is_warn: false, is_error: false }]

    const inFlight = await getSeoAuditStuckTasksSignal()

    expect(inFlight.severity).toBe('ok')
    expect(state.params).toEqual([SEO_AUDIT_STUCK_WARN_HOURS, SEO_AUDIT_STUCK_ERROR_HOURS])
  })

  it('run colgado ≥6h → warning', async () => {
    state.rows = [{ audit_run_id: 'seoar-1', seo_target_id: 'seot-1', is_warn: true, is_error: false }]

    const signal = await getSeoAuditStuckTasksSignal()

    expect(signal.severity).toBe('warning')
  })

  it('zombie ≥30h (el collect no corre) → error', async () => {
    state.rows = [
      { audit_run_id: 'seoar-1', seo_target_id: 'seot-1', is_warn: true, is_error: false },
      { audit_run_id: 'seoar-2', seo_target_id: 'seot-2', is_warn: true, is_error: true }
    ]

    const signal = await getSeoAuditStuckTasksSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('ops-seo-audit-collect')
  })

  it('la query nunca usa EXTRACT(EPOCH) ni DATE-DATE', async () => {
    await getSeoAuditStuckTasksSignal()

    expect(state.sql).not.toContain('EXTRACT(EPOCH')
    expect(state.sql).toContain("INTERVAL '1 hour'")
  })

  it('fallo de PG degrada a unknown observado', async () => {
    state.fail = true

    const signal = await getSeoAuditStuckTasksSignal()

    expect(signal.severity).toBe('unknown')
  })
})
