import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn(),
  computeAttributableLatenessForTask: vi.fn(),
  patchNotionPage: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

vi.mock('@/lib/sync/projections/notion-attributable-lateness-compute', () => ({
  computeAttributableLatenessForTask: mocks.computeAttributableLatenessForTask
}))

vi.mock('@/lib/space-notion/notion-client', () => ({
  patchNotionPage: mocks.patchNotionPage
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

import { runOtdWritebackBatch } from './otd-writeback-batch'

/**
 * Router del mock PG. opts controla cada SELECT/INSERT/UPDATE por substring del SQL.
 */
const routePg = (opts: {
  terminalOpen?: number
  cohort?: { task_source_id: string; workspace_id: string }[]
  freshByTask?: Record<string, { bucket_attributable: string; data_status: string }>
  latestByTask?: Record<string, { otd_bucket: string | null; written_to_notion_at: string | null }>
}) => {
  mocks.runGreenhousePostgresQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes("task_status IN ('Aprobado', 'Archivado')")) {
      return [{ n: opts.terminalOpen ?? 0 }]
    }

    if (sql.includes('SELECT DISTINCT task_source_id, workspace_id')) {
      return opts.cohort ?? []
    }

    if (sql.includes('SELECT bucket_attributable, data_status')) {
      const taskId = (params as string[])[0]
      const fresh = opts.freshByTask?.[taskId]

      
return fresh ? [fresh] : []
    }

    if (sql.includes('SELECT otd_bucket, written_to_notion_at')) {
      const taskId = (params as string[])[0]
      const latest = opts.latestByTask?.[taskId]

      
return latest ? [latest] : []
    }

    if (sql.includes('INSERT INTO greenhouse_delivery.task_otd_writeback_snapshots')) {
      return [{ snapshot_id: `snap-${(params as string[])[0]}` }]
    }

    
return [] // UPDATE marks
  })
}

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
  mocks.computeAttributableLatenessForTask.mockReset().mockResolvedValue('ok')
  mocks.patchNotionPage.mockReset().mockResolvedValue(undefined)
  mocks.captureWithDomain.mockReset()
  vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED', '')
  vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', '')
  vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_SKY', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runOtdWritebackBatch (TASK-927)', () => {
  it('flag OFF en todos los workspaces → no-op (no PATCH, no PG)', async () => {
    const result = await runOtdWritebackBatch()

    expect(result.workspacesEnabled).toEqual([])
    expect(result.written).toBe(0)
    expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
  })

  it('gate ISSUE-098: bloquea si hay tareas terminales con bucket abierto (no escribe)', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({ terminalOpen: 3 })

    const result = await runOtdWritebackBatch()

    expect(result.gateBlocked).toBe(true)
    expect(result.terminalOpenCount).toBe(3)
    expect(result.written).toBe(0)
    expect(mocks.patchNotionPage).not.toHaveBeenCalled()
    expect(mocks.captureWithDomain).toHaveBeenCalled()
  })

  it('happy path: recompute + INSERT snapshot + PATCH [GH] OTD select + mark written', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({
      terminalOpen: 0,
      cohort: [{ task_source_id: 't1', workspace_id: 'efeonce' }],
      freshByTask: { t1: { bucket_attributable: 'late_drop', data_status: 'valid' } }
    })

    const result = await runOtdWritebackBatch()

    expect(mocks.computeAttributableLatenessForTask).toHaveBeenCalledWith('t1', 'efeonce')
    expect(mocks.patchNotionPage).toHaveBeenCalledWith('t1', {
      '[GH] OTD': { select: { name: '🟡 Late Drop' } }
    })
    expect(result.written).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('idempotencia skip-if-unchanged: último snapshot escrito con el mismo bucket → skip', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({
      cohort: [{ task_source_id: 't1', workspace_id: 'efeonce' }],
      freshByTask: { t1: { bucket_attributable: 'on_time', data_status: 'valid' } },
      latestByTask: { t1: { otd_bucket: 'on_time', written_to_notion_at: '2026-06-19T00:00:00Z' } }
    })

    const result = await runOtdWritebackBatch()

    expect(result.skippedUnchanged).toBe(1)
    expect(result.written).toBe(0)
    expect(mocks.patchNotionPage).not.toHaveBeenCalled()
  })

  it('re-escribe si el bucket cambió vs el último escrito', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({
      cohort: [{ task_source_id: 't1', workspace_id: 'efeonce' }],
      freshByTask: { t1: { bucket_attributable: 'overdue', data_status: 'valid' } },
      latestByTask: { t1: { otd_bucket: 'on_time', written_to_notion_at: '2026-06-18T00:00:00Z' } }
    })

    const result = await runOtdWritebackBatch()

    expect(result.written).toBe(1)
    expect(mocks.patchNotionPage).toHaveBeenCalledWith('t1', {
      '[GH] OTD': { select: { name: '🔴 Overdue' } }
    })
  })

  it('degradación honesta: data_status != valid → no escribe', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({
      cohort: [{ task_source_id: 't1', workspace_id: 'efeonce' }],
      freshByTask: { t1: { bucket_attributable: 'overdue', data_status: 'legacy_unknown' } }
    })

    const result = await runOtdWritebackBatch()

    expect(result.skippedNotValid).toBe(1)
    expect(mocks.patchNotionPage).not.toHaveBeenCalled()
  })

  it('PATCH retryable error → marca failed sin captura Sentry directa y sigue', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({
      cohort: [{ task_source_id: 't1', workspace_id: 'efeonce' }],
      freshByTask: { t1: { bucket_attributable: 'late_drop', data_status: 'valid' } }
    })
    mocks.patchNotionPage.mockRejectedValueOnce(new Error('429 rate limit'))

    const result = await runOtdWritebackBatch()

    expect(result.failed).toBe(1)
    expect(result.written).toBe(0)
    expect(mocks.captureWithDomain).not.toHaveBeenCalled()
  })

  it('PATCH archived block → marca terminal skip sin retry ni captura Sentry', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    routePg({
      cohort: [{ task_source_id: 't1', workspace_id: 'efeonce' }],
      freshByTask: { t1: { bucket_attributable: 'late_drop', data_status: 'valid' } }
    })

    const notionErr = new Error(
      "Notion API PATCH 400: Can't edit block that is archived. You must unarchive the block before editing."
    ) as Error & { status?: number; code?: string }

    notionErr.status = 400
    notionErr.code = 'validation_error'
    mocks.patchNotionPage.mockRejectedValueOnce(notionErr)

    const result = await runOtdWritebackBatch()

    expect(result.skippedTerminal).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.written).toBe(0)
    expect(mocks.captureWithDomain).not.toHaveBeenCalled()
  })

  it('per-cliente: solo procesa workspaces con flag ON', async () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    // sky queda OFF
    routePg({ cohort: [], freshByTask: {} })

    const result = await runOtdWritebackBatch()

    expect(result.workspacesEnabled).toEqual(['efeonce'])
  })
})
