import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

import { countCorrectionTransitions } from './count-correction-transitions'

beforeEach(() => {
  mocks.query.mockReset()
})

// Helpers
const setQueryResults = (
  probeCount: number,
  correctionRows: Array<{ transitioned_at: Date | string; transitioned_by: string | null }> = []
) => {
  // First call: probe COUNT(*) → returns array of one row {count: 'N'}
  mocks.query.mockResolvedValueOnce([{ count: String(probeCount) }])

  // Second call (only if probe > 0): correction transitions fetch
  if (probeCount > 0) {
    mocks.query.mockResolvedValueOnce(correctionRows)
  }
}

const TASK_ID = 'notion-page-uuid-001'

describe('countCorrectionTransitions — TASK-908 Slice 3.5 canonical V1', () => {
  describe('Edge cases (sin DB call)', () => {
    it('taskSourceId vacío string → unavailable + count=0', async () => {
      const r = await countCorrectionTransitions({ taskSourceId: '' })

      expect(r.count).toBe(0)
      expect(r.sourceMode).toBe('unavailable')
      expect(r.transitions).toEqual([])
      expect(mocks.query).not.toHaveBeenCalled()
    })

    it('taskSourceId solo whitespace → unavailable', async () => {
      const r = await countCorrectionTransitions({ taskSourceId: '   ' })

      expect(r.count).toBe(0)
      expect(r.sourceMode).toBe('unavailable')
      expect(mocks.query).not.toHaveBeenCalled()
    })

    // Type-safe null/undefined no es posible por TS, pero defensive runtime check
    it('taskSourceId undefined cast (defensive runtime) → unavailable', async () => {
      const r = await countCorrectionTransitions({
         
        taskSourceId: undefined as any
      })

      expect(r.count).toBe(0)
      expect(r.sourceMode).toBe('unavailable')
    })
  })

  describe('Source mode discrimination', () => {
    it('tarea SIN rows en table → sourceMode="unavailable"', async () => {
      setQueryResults(0)

      const r = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(r.sourceMode).toBe('unavailable')
      expect(r.count).toBe(0)
      expect(r.transitions).toEqual([])
      expect(mocks.query).toHaveBeenCalledTimes(1) // solo probe
    })

    it('tarea CON rows en table pero SIN correciones → sourceMode="canonical" + count=0', async () => {
      setQueryResults(5, []) // probe finds 5 transitions total, but 0 are corrections

      const r = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(r.sourceMode).toBe('canonical')
      expect(r.count).toBe(0)
      expect(r.transitions).toEqual([])
      expect(mocks.query).toHaveBeenCalledTimes(2)
    })
  })

  describe('Happy paths (counting correction transitions)', () => {
    it('1 transición Listo→Cambios solicitados → count=1', async () => {
      const transitionedAt = new Date('2026-05-10T15:30:00.000Z')

      setQueryResults(3, [{ transitioned_at: transitionedAt, transitioned_by: 'user-abc' }])

      const r = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(r.count).toBe(1)
      expect(r.sourceMode).toBe('canonical')
      expect(r.transitions).toEqual([
        { transitionedAt, transitionedBy: 'user-abc' }
      ])
    })

    it('3 transitions (oscilación múltiple cliente) → count=3', async () => {
      setQueryResults(10, [
        { transitioned_at: new Date('2026-05-05T10:00:00.000Z'), transitioned_by: 'u1' },
        { transitioned_at: new Date('2026-05-08T14:00:00.000Z'), transitioned_by: 'u2' },
        { transitioned_at: new Date('2026-05-12T11:00:00.000Z'), transitioned_by: null }
      ])

      const r = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(r.count).toBe(3)
      expect(r.sourceMode).toBe('canonical')
      expect(r.transitions).toHaveLength(3)
    })

    it('parsea timestamp string PG a Date', async () => {
      setQueryResults(2, [
        { transitioned_at: '2026-05-10T15:30:00.000Z', transitioned_by: 'u1' }
      ])

      const r = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(r.transitions[0].transitionedAt).toEqual(new Date('2026-05-10T15:30:00.000Z'))
    })

    it('transitionedBy null preservado', async () => {
      setQueryResults(2, [
        { transitioned_at: new Date('2026-05-10T10:00:00.000Z'), transitioned_by: null }
      ])

      const r = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(r.transitions[0].transitionedBy).toBeNull()
    })
  })

  describe('Window filter (windowStart / windowEnd)', () => {
    it('pasa windowStart como param a query', async () => {
      const windowStart = new Date('2026-05-01T00:00:00.000Z')

      setQueryResults(5, [])

      await countCorrectionTransitions({ taskSourceId: TASK_ID, windowStart })

      expect(mocks.query.mock.calls[1][1]).toEqual([TASK_ID, windowStart, null])
    })

    it('pasa windowEnd como param a query', async () => {
      const windowEnd = new Date('2026-05-31T23:59:59.999Z')

      setQueryResults(5, [])

      await countCorrectionTransitions({ taskSourceId: TASK_ID, windowEnd })

      expect(mocks.query.mock.calls[1][1]).toEqual([TASK_ID, null, windowEnd])
    })

    it('window vacío (ambos null) → query con [taskId, null, null]', async () => {
      setQueryResults(5, [])

      await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(mocks.query.mock.calls[1][1]).toEqual([TASK_ID, null, null])
    })
  })

  describe('SQL query canonical (verifies anti-regression)', () => {
    it('probe query filtra por task_source_id', async () => {
      setQueryResults(0)

      await countCorrectionTransitions({ taskSourceId: TASK_ID })

      const probeSql = mocks.query.mock.calls[0][0]

      expect(probeSql).toContain('task_status_transitions')
      expect(probeSql).toContain('task_source_id = $1')
    })

    it('correction query filtra por from_status=Listo para revisión + to_status=Cambios solicitados', async () => {
      setQueryResults(5, [])

      await countCorrectionTransitions({ taskSourceId: TASK_ID })

      const correctionSql = mocks.query.mock.calls[1][0]

      expect(correctionSql).toContain("from_status = 'Listo para revisión'")
      expect(correctionSql).toContain("to_status   = 'Cambios solicitados'")
      expect(correctionSql).toContain('ORDER BY transitioned_at ASC')
    })

    it('canonical V1 — NO acepta legacy "En feedback" (normalizado upstream)', async () => {
      setQueryResults(5, [])

      await countCorrectionTransitions({ taskSourceId: TASK_ID })

      const correctionSql = mocks.query.mock.calls[1][0]

      // Anti-regression: query NO debe contener "En feedback" o "En Feedback"
      // (la normalization vive en el webhook handler upstream, NO acá)
      expect(correctionSql).not.toContain('En feedback')
      expect(correctionSql).not.toContain('En Feedback')
    })
  })

  describe('Idempotencia', () => {
    it('2 invocaciones consecutivas con mismos inputs producen result equivalente', async () => {
      const transitionedAt = new Date('2026-05-10T15:30:00.000Z')

      setQueryResults(3, [{ transitioned_at: transitionedAt, transitioned_by: 'u1' }])

      const a = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      // Reset + setup second call same way
      mocks.query.mockReset()
      setQueryResults(3, [{ transitioned_at: transitionedAt, transitioned_by: 'u1' }])

      const b = await countCorrectionTransitions({ taskSourceId: TASK_ID })

      expect(a).toEqual(b)
    })
  })
})
