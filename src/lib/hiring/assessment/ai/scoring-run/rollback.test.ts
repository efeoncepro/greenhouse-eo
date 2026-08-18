/**
 * TASK-1734 Slice 6 — tests del rollback drain gobernado (`rollbackAssessmentAiScoringRuns`).
 *
 * Contratos probados:
 *  - dry-run (default): enumera + reporta, CERO mutación (ni cancel ni reconcile).
 *  - apply: cancela cada run no terminal EN ORDEN created_at, luego reconcilia, y el
 *    reporte prueba residual cero + cola manual preservada (cero items perdidos).
 *  - apply sobre sistema ya drenado: no-op idempotente con reporte limpio.
 *  - residual > 0 post-apply ⇒ `clean=false` (el reporte nunca miente éxito).
 *  - actor vacío ⇒ 401 (auditoría append-only exige actor identificable).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQueryMock = vi.fn()
const cancelMock = vi.fn()
const reconcileMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args),
}))

vi.mock('./commands', () => ({
  cancelAssessmentAiScoringRun: (...args: unknown[]) => cancelMock(...args),
  reconcileAssessmentAiScoringRuns: (...args: unknown[]) => reconcileMock(...args),
}))

import { HiringValidationError } from '../../../errors'
import { rollbackAssessmentAiScoringRuns } from './rollback'

const runRow = (runId: string, assessmentId: string, createdAt: string) => ({
  run_id: runId,
  assessment_id: assessmentId,
  application_id: 'EO-APP-0001',
  status: 'scoring',
  created_at: createdAt,
})

const residualRow = (runs = 0, items = 0, proposals = 0) => ({
  non_terminal_runs: runs,
  non_terminal_items: items,
  orphan_proposals: proposals,
})

/** Despacha por forma del SQL: lista de runs / residual / cola manual. */
const wireQueries = (input: {
  runs: Array<Record<string, unknown>>
  residual: Record<string, unknown>
  manualPending: number
}) => {
  runQueryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('ORDER BY created_at')) return input.runs
    if (sql.includes('non_terminal_runs')) return [input.residual]
    if (sql.includes('needs_human_rating')) return [{ n: input.manualPending }]

    throw new Error(`SQL inesperado en el test: ${sql.slice(0, 80)}`)
  })
}

beforeEach(() => {
  runQueryMock.mockReset()
  cancelMock.mockReset()
  reconcileMock.mockReset()
})

describe('rollbackAssessmentAiScoringRuns', () => {
  it('rechaza actor vacío con 401 (nunca mutación anónima)', async () => {
    await expect(
      rollbackAssessmentAiScoringRuns({ actorUserId: '  ', apply: true }),
    ).rejects.toMatchObject({ code: 'assessment_ai_run_missing_actor' })

    await expect(
      rollbackAssessmentAiScoringRuns({ actorUserId: '', apply: false }),
    ).rejects.toBeInstanceOf(HiringValidationError)

    expect(cancelMock).not.toHaveBeenCalled()
    expect(reconcileMock).not.toHaveBeenCalled()
  })

  it('dry-run: enumera runs y residual SIN cancelar ni reconciliar', async () => {
    wireQueries({
      runs: [runRow('run-1', 'EO-ASM-0001', '2026-08-16T10:00:00Z')],
      residual: residualRow(1, 3, 2),
      manualPending: 4,
    })

    const report = await rollbackAssessmentAiScoringRuns({ actorUserId: 'user-ops', apply: false })

    expect(report.dryRun).toBe(true)
    expect(report.runsFound).toHaveLength(1)
    expect(report.runsFound[0]).toMatchObject({ runId: 'run-1', assessmentId: 'EO-ASM-0001', status: 'scoring' })
    expect(report.runsCancelled).toEqual([])
    expect(report.reconcile).toBeNull()
    expect(report.residual).toEqual({ nonTerminalRuns: 1, nonTerminalItems: 3, orphanProposals: 2 })
    expect(report.manualQueuePending).toBe(4)
    expect(report.clean).toBe(false)

    expect(cancelMock).not.toHaveBeenCalled()
    expect(reconcileMock).not.toHaveBeenCalled()
  })

  it('apply: cancela en orden created_at, reconcilia y prueba residual cero', async () => {
    wireQueries({
      runs: [
        runRow('run-old', 'EO-ASM-0001', '2026-08-15T09:00:00Z'),
        runRow('run-new', 'EO-ASM-0002', '2026-08-16T09:00:00Z'),
      ],
      residual: residualRow(0, 0, 0),
      manualPending: 7,
    })
    cancelMock.mockResolvedValue({ run: {}, items: [] })
    reconcileMock.mockResolvedValue({ proposalsSuperseded: 2, itemsSuperseded: 1, runsClosed: 0 })

    const report = await rollbackAssessmentAiScoringRuns({ actorUserId: 'user-ops', apply: true })

    // Orden de cancel = orden de enumeración (created_at asc), reason del rollback.
    expect(cancelMock.mock.calls).toEqual([
      ['run-old', 'user-ops', 'rollback_drain'],
      ['run-new', 'user-ops', 'rollback_drain'],
    ])

    // El reconcile corre DESPUÉS del último cancel.
    expect(reconcileMock).toHaveBeenCalledExactlyOnceWith('user-ops')
    expect(cancelMock.mock.invocationCallOrder.at(-1)!).toBeLessThan(
      reconcileMock.mock.invocationCallOrder[0]!,
    )

    expect(report.dryRun).toBe(false)
    expect(report.runsCancelled).toEqual(['run-old', 'run-new'])
    expect(report.reconcile).toEqual({ proposalsSuperseded: 2, itemsSuperseded: 1, runsClosed: 0 })
    expect(report.residual).toEqual({ nonTerminalRuns: 0, nonTerminalItems: 0, orphanProposals: 0 })
    // Cero items fuera de la cola: el trabajo pendiente sigue esperando score humano.
    expect(report.manualQueuePending).toBe(7)
    expect(report.clean).toBe(true)
  })

  it('apply respeta reasonCode custom', async () => {
    wireQueries({
      runs: [runRow('run-1', 'EO-ASM-0001', '2026-08-16T10:00:00Z')],
      residual: residualRow(),
      manualPending: 0,
    })
    cancelMock.mockResolvedValue({ run: {}, items: [] })
    reconcileMock.mockResolvedValue({ proposalsSuperseded: 0, itemsSuperseded: 0, runsClosed: 0 })

    await rollbackAssessmentAiScoringRuns({
      actorUserId: 'user-ops',
      apply: true,
      reasonCode: 'canary_abort',
    })

    expect(cancelMock).toHaveBeenCalledWith('run-1', 'user-ops', 'canary_abort')
  })

  it('apply sobre sistema ya drenado: no-op idempotente con reporte limpio', async () => {
    wireQueries({ runs: [], residual: residualRow(), manualPending: 0 })
    reconcileMock.mockResolvedValue({ proposalsSuperseded: 0, itemsSuperseded: 0, runsClosed: 0 })

    const report = await rollbackAssessmentAiScoringRuns({ actorUserId: 'user-ops', apply: true })

    expect(cancelMock).not.toHaveBeenCalled()
    // El reconcile SÍ corre igual: cierra huérfanas del carril manual aunque no haya runs.
    expect(reconcileMock).toHaveBeenCalledOnce()
    expect(report.runsFound).toEqual([])
    expect(report.runsCancelled).toEqual([])
    expect(report.clean).toBe(true)
    expect(report.manualQueuePending).toBe(0)
  })

  it('residual > 0 post-apply ⇒ clean=false (el reporte no miente éxito)', async () => {
    wireQueries({
      runs: [runRow('run-1', 'EO-ASM-0001', '2026-08-16T10:00:00Z')],
      residual: residualRow(0, 1, 0),
      manualPending: 2,
    })
    cancelMock.mockResolvedValue({ run: {}, items: [] })
    reconcileMock.mockResolvedValue({ proposalsSuperseded: 0, itemsSuperseded: 0, runsClosed: 0 })

    const report = await rollbackAssessmentAiScoringRuns({ actorUserId: 'user-ops', apply: true })

    expect(report.clean).toBe(false)
    expect(report.residual.nonTerminalItems).toBe(1)
  })
})
