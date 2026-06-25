import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1245 Slice 1 — `readPublicGraderRunStatus(handle)`: traduce el estado interno del run
 * a un DTO público bounded. Cubre la resolución por poll_token (a-medida) y submissionId
 * (convergente + su ventana), el mapeo de estados, el gate del reportToken (sólo cuando hay
 * snapshot publicable) y el invariante de no-leak (sin PII/raw/razones internas en el DTO).
 */

const state = {
  byToken: null as { run_id: string; status: string } | null,
  bySubmission: null as { run_id: string | null; status: string | null } | null,
  submissionExists: false,
  reportToken: null as string | null,
}

const queries: string[] = []

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    queries.push(sql)

    if (sql.includes('WHERE poll_token = $1')) return state.byToken ? [state.byToken] : []
    if (sql.includes('grader_leads l')) return state.bySubmission ? [state.bySubmission] : []

    return []
  },
}))

vi.mock('@/lib/growth/forms/store', () => ({
  getSubmissionById: async () => (state.submissionExists ? { submission_id: 'fsub-1' } : null),
}))

vi.mock('../hubspot/report-link', () => ({
  getLatestReportTokenForRun: async () => state.reportToken,
}))

const load = async () => (await import('../public-delivery/status-reader')).readPublicGraderRunStatus

beforeEach(() => {
  state.byToken = null
  state.bySubmission = null
  state.submissionExists = false
  state.reportToken = null
  queries.length = 0
})

describe('TASK-1245 — readPublicGraderRunStatus', () => {
  it('poll_token → run succeeded con snapshot publicable → ready + reportToken', async () => {
    state.byToken = { run_id: 'grun-1', status: 'succeeded' }
    state.reportToken = 'grt-abc123'
    const read = await load()
    const res = await read('gpt-abc')

    expect(res.status).toBe('ready')
    expect(res.reportToken).toBe('grt-abc123')
    expect(res.retryAfterSeconds).toBeNull()
  })

  it('run pending → queued; running → processing (con retryAfter)', async () => {
    const read = await load()

    state.byToken = { run_id: 'grun-1', status: 'pending' }
    expect((await read('gpt-x')).status).toBe('queued')

    state.byToken = { run_id: 'grun-1', status: 'running' }
    const proc = await read('gpt-x')

    expect(proc.status).toBe('processing')
    expect(proc.retryAfterSeconds).toBe(5)
    expect(proc.reportToken).toBeNull()
  })

  it('succeeded sin snapshot todavía → processing (transitorio, sin token)', async () => {
    state.byToken = { run_id: 'grun-1', status: 'succeeded' }
    state.reportToken = null
    const res = await (await load())('gpt-x')

    expect(res.status).toBe('processing')
    expect(res.reportToken).toBeNull()
  })

  it('failed/skipped → unavailable (sin reporte falso)', async () => {
    const read = await load()

    state.byToken = { run_id: 'grun-1', status: 'failed' }
    expect((await read('gpt-x')).status).toBe('unavailable')

    state.byToken = { run_id: 'grun-1', status: 'skipped' }
    expect((await read('gpt-x')).status).toBe('unavailable')
  })

  it('submissionId (convergente) → resuelve run vía lead', async () => {
    state.bySubmission = { run_id: 'grun-9', status: 'running' }
    const res = await (await load())('fsub-1')

    expect(res.status).toBe('processing')
  })

  it('ventana convergente: lead con run_id null → queued', async () => {
    state.bySubmission = { run_id: null, status: null }
    expect((await (await load())('fsub-1')).status).toBe('queued')
  })

  it('ventana convergente: submission existe pero aún sin lead/run → queued (no 404)', async () => {
    state.submissionExists = true
    expect((await (await load())('fsub-1')).status).toBe('queued')
  })

  it('handle inexistente → not_found; handle vacío → not_found', async () => {
    const read = await load()

    expect((await read('gpt-nope')).status).toBe('not_found')
    expect((await read('   ')).status).toBe('not_found')
  })

  it('public_id SECUENCIAL nunca resuelve (no enumerable): EO-GRUN-#### → not_found', async () => {
    // El reader sólo consulta poll_token / submission; nunca matchea por public_id.
    const res = await (await load())('EO-GRUN-00012')

    expect(res.status).toBe('not_found')
    expect(queries.some(q => q.includes('public_id ='))).toBe(false)
  })

  it('no-leak: el DTO sólo expone status/reportToken/reason/retryAfter (sin email/raw/razón interna)', async () => {
    state.byToken = { run_id: 'grun-1', status: 'succeeded' }
    state.reportToken = 'grt-abc'
    const res = await (await load())('gpt-x')

    expect(Object.keys(res).sort()).toEqual(['reason', 'reportToken', 'retryAfterSeconds', 'status'])
  })
})
