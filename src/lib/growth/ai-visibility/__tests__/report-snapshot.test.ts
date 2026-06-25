import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildGraderReport, toPublicGraderReport, type ReportRunMeta } from '../report/builder'
import { makeScore } from './report-fixtures'

const RUN: ReportRunMeta = {
  runId: 'run-snap',
  status: 'succeeded',
  promptPackVersion: 'prompt-pack.v1',
  finishedAt: '2026-06-24T12:00:00.000Z'
}

// readGraderReport mockeado: devuelve el reporte según el gate que queramos probar.
const reportState = { gate: 'ready' as 'ready' | 'review_required' | 'insufficient_data' }

vi.mock('../report/command', () => ({
  readGraderReport: async () => {
    const score = makeScore(
      { ai_visibility: 40 },
      reportState.gate === 'ready'
        ? {}
        : { scoreStatus: reportState.gate === 'insufficient_data' ? 'insufficient_data' : 'review_required' }
    )

    const report = buildGraderReport({ score, findings: [], run: RUN })

    // Forzamos el gate del reporte para el test (el builder lo deriva del scoreStatus/runStatus).
    report.gate = { ...report.gate, status: reportState.gate }

    return { report, publicReport: toPublicGraderReport(report) }
  }
}))

// pg client mockeado: capturamos los INSERT/SELECT. Los flags controlan si el
// INSERT/SELECT devuelve fila (idempotencia / not-found).
const sql: {
  calls: Array<{ text: string; params: unknown[] }>
  insertReturnsRow: boolean
  selectReturnsRow: boolean
} = { calls: [], insertReturnsRow: true, selectReturnsRow: true }

const fakeRow = {
  report_id: 'grpt-1',
  report_token: 'grt-deadbeef',
  as_of: '2026-06-24T22:00:00.000Z',
  expires_at: null,
  public_report_json: { audience: 'public' }
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (text: string, params: unknown[]) => {
    sql.calls.push({ text, params })

    if (text.includes('INSERT INTO greenhouse_growth.grader_reports')) {
      return sql.insertReturnsRow ? [fakeRow] : []
    }

    if (text.includes('SELECT report_id')) {
      return sql.selectReturnsRow ? [fakeRow] : []
    }

    return []
  }
}))


beforeEach(() => {
  sql.calls = []
  sql.insertReturnsRow = true
  sql.selectReturnsRow = true
  reportState.gate = 'ready'
})

describe('growth/ai-visibility — public report snapshot (TASK-1239)', () => {
  it('publica el snapshot de un reporte ready y devuelve el token', async () => {
    const { publishGraderReportSnapshot } = await import('../report/snapshot')
    const result = await publishGraderReportSnapshot({ runId: 'run-snap' })

    expect(result.reportToken).toBe('grt-deadbeef')
    expect(sql.calls[0].text).toContain('INSERT INTO greenhouse_growth.grader_reports')
    expect(sql.calls[0].text).toContain('ON CONFLICT')
  })

  it('NO publica un reporte review_required (gate de release)', async () => {
    reportState.gate = 'review_required'
    const { publishGraderReportSnapshot, GraderSnapshotError } = await import('../report/snapshot')

    await expect(publishGraderReportSnapshot({ runId: 'run-snap' })).rejects.toBeInstanceOf(GraderSnapshotError)
    expect(sql.calls.some(c => c.text.includes('INSERT'))).toBe(false)
  })

  it('NO publica un reporte insufficient_data', async () => {
    reportState.gate = 'insufficient_data'
    const { publishGraderReportSnapshot } = await import('../report/snapshot')

    await expect(publishGraderReportSnapshot({ runId: 'run-snap' })).rejects.toThrow()
  })

  it('idempotente: conflicto → recupera el snapshot existente (no duplica)', async () => {
    sql.insertReturnsRow = false // ON CONFLICT DO NOTHING → 0 filas
    sql.selectReturnsRow = true
    const { publishGraderReportSnapshot } = await import('../report/snapshot')
    const result = await publishGraderReportSnapshot({ runId: 'run-snap' })

    expect(result.reportToken).toBe('grt-deadbeef')
    expect(sql.calls.some(c => c.text.includes('SELECT report_id'))).toBe(true)
  })

  it('readPublicGraderReport: token → snapshot; respeta expires_at en SQL', async () => {
    const { readPublicGraderReport } = await import('../report/snapshot')
    const found = await readPublicGraderReport('grt-deadbeef')

    expect(found?.reportToken).toBe('grt-deadbeef')
    expect(sql.calls[0].text).toContain('expires_at IS NULL OR expires_at > NOW()')

    sql.selectReturnsRow = false
    expect(await readPublicGraderReport('grt-missing')).toBeNull()
  })
})
