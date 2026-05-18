import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  countCorrectionTransitions: vi.fn()
}))

vi.mock('./count-correction-transitions', () => ({
  countCorrectionTransitions: mocks.countCorrectionTransitions
}))

import { calculateRpa, RPA_FORMULA_VERSION } from './calculate-rpa'

beforeEach(() => {
  mocks.countCorrectionTransitions.mockReset()
})

const TASK_ID = 'notion-page-uuid-rpa-001'

// Helper canonical: build CountCorrectionTransitionsResult mocks
const transitionsResult = (
  count: number,
  sourceMode: 'canonical' | 'unavailable' = 'canonical'
) => ({
  count,
  sourceMode,
  transitions: Array.from({ length: count }, (_, idx) => ({
    transitionedAt: new Date(`2026-05-01T0${idx}:00:00Z`),
    transitionedBy: `notion-user-${idx}`
  }))
})

describe('calculateRpa — TASK-901 Slice 1 canonical V1', () => {
  describe('Happy paths — sourceMode canonical', () => {
    // Test 1 spec §4.2
    it('0 transitions → value=0, dataStatus=valid', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0))

      const r = await calculateRpa({ taskSourceId: TASK_ID })

      expect(r.value).toBe(0)
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.inputsUsed.correctionTransitionsCount).toBe(0)
      expect(r.inputsUsed.taskSourceId).toBe(TASK_ID)
      expect(r.formulaVersion).toBe(RPA_FORMULA_VERSION)
    })

    // Test 2 spec §4.2
    it('1 transición → value=1', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(1))

      const r = await calculateRpa({ taskSourceId: TASK_ID })

      expect(r.value).toBe(1)
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.inputsUsed.correctionTransitionsCount).toBe(1)
    })

    // Test 3 spec §4.2
    it('5 transiciones (oscilación múltiple) → value=5', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(5))

      const r = await calculateRpa({ taskSourceId: TASK_ID })

      expect(r.value).toBe(5)
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.inputsUsed.correctionTransitionsCount).toBe(5)
    })
  })

  describe('Window filter', () => {
    // Test 4 spec §4.2
    it('window filter: passes windowStart + windowEnd a countCorrectionTransitions', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(2))

      const windowStart = new Date('2026-05-01T00:00:00Z')
      const windowEnd = new Date('2026-05-31T23:59:59Z')

      const r = await calculateRpa({ taskSourceId: TASK_ID, windowStart, windowEnd })

      expect(r.value).toBe(2)
      expect(r.dataStatus).toBe('valid')
      expect(mocks.countCorrectionTransitions).toHaveBeenCalledWith({
        taskSourceId: TASK_ID,
        windowStart,
        windowEnd
      })
      expect(r.inputsUsed.windowStart).toBe(windowStart)
      expect(r.inputsUsed.windowEnd).toBe(windowEnd)
    })

    // Edge case extra — verdict ICO modification request
    it('window invertida (windowStart > windowEnd) → delegated honest, value=0 con sourceMode canonical si tarea tiene rows', async () => {
      // Foundation helper retorna count=0 cuando window invertida pero tarea tiene rows
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0))

      const windowStart = new Date('2026-05-31T23:59:59Z')
      const windowEnd = new Date('2026-05-01T00:00:00Z')

      const r = await calculateRpa({ taskSourceId: TASK_ID, windowStart, windowEnd })

      expect(r.value).toBe(0)
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.inputsUsed.windowStart).toBe(windowStart)
      expect(r.inputsUsed.windowEnd).toBe(windowEnd)
    })
  })

  describe('Edge cases — sourceMode unavailable', () => {
    // Test 5 spec §4.2
    it('tarea pre-TASK-912 (sourceMode=unavailable) → value=null, dataStatus=unavailable', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0, 'unavailable'))

      const r = await calculateRpa({ taskSourceId: TASK_ID })

      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
      expect(r.sourceMode).toBe('unavailable')
      expect(r.inputsUsed.correctionTransitionsCount).toBe(0)
      expect(r.inputsUsed.taskSourceId).toBe(TASK_ID)
    })

    // Test 6 spec §4.2
    it('taskSourceId vacío → value=null, dataStatus=unavailable (delegated upstream)', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0, 'unavailable'))

      const r = await calculateRpa({ taskSourceId: '' })

      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
      expect(r.sourceMode).toBe('unavailable')
      expect(r.inputsUsed.taskSourceId).toBe('')
    })
  })

  describe('Forward-compat V2 (Frame.io fields)', () => {
    // Test 7 spec §4.2
    it('V2 fields pasados pero V1 los ignora silenciosamente → mismo result', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(2))

      const r = await calculateRpa({
        taskSourceId: TASK_ID,
        clientReviewOpen: true,
        workflowReviewOpen: false,
        openFrameComments: 5
      })

      expect(r.value).toBe(2)
      expect(r.dataStatus).toBe('valid')
      // Foundation helper NO recibe V2 fields (V1 ignora silenciosamente)
      expect(mocks.countCorrectionTransitions).toHaveBeenCalledWith({
        taskSourceId: TASK_ID,
        windowStart: undefined,
        windowEnd: undefined
      })
    })
  })

  describe('Idempotencia', () => {
    // Test 8 spec §4.2
    it('2 invocaciones consecutivas con mismos inputs → mismo result', async () => {
      mocks.countCorrectionTransitions.mockResolvedValue(transitionsResult(3))

      const r1 = await calculateRpa({ taskSourceId: TASK_ID })
      const r2 = await calculateRpa({ taskSourceId: TASK_ID })

      expect(r1).toEqual(r2)
      expect(r1.value).toBe(3)
      expect(r1.formulaVersion).toBe(r2.formulaVersion)
      expect(r1.inputsUsed.correctionTransitionsCount).toBe(r2.inputsUsed.correctionTransitionsCount)
    })
  })

  describe('Formula version canonical', () => {
    it('RPA_FORMULA_VERSION === rpa_v1.0 (anti-regresión)', () => {
      expect(RPA_FORMULA_VERSION).toBe('rpa_v1.0')
    })

    it('result siempre incluye formulaVersion canonical (valid + unavailable paths)', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(2))
      const valid = await calculateRpa({ taskSourceId: TASK_ID })

      expect(valid.formulaVersion).toBe('rpa_v1.0')

      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0, 'unavailable'))
      const unavailable = await calculateRpa({ taskSourceId: TASK_ID })

      expect(unavailable.formulaVersion).toBe('rpa_v1.0')
    })
  })

  describe('Null-not-zero contract canonical (Delivery Metrics Ownership Boundary invariants)', () => {
    it('sourceMode=unavailable NUNCA produce value=0 — siempre value=null', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0, 'unavailable'))

      const r = await calculateRpa({ taskSourceId: TASK_ID })

      // Anti-regresión TASK-877 follow-up bug class: 3,168 Sky tareas con rpa=null
      // por bug del sync legacy. Si calculateRpa retornara 0, bonus calc inflaría
      // a "full payout" para tareas sin tracking. Mapping unavailable→null es
      // load-bearing para preservar la degradación honesta downstream.
      expect(r.value).toBeNull()
      expect(r.value).not.toBe(0)
      expect(r.dataStatus).toBe('unavailable')
    })

    it('sourceMode=canonical con count=0 SÍ produce value=0 (distingue de unavailable)', async () => {
      mocks.countCorrectionTransitions.mockResolvedValueOnce(transitionsResult(0, 'canonical'))

      const r = await calculateRpa({ taskSourceId: TASK_ID })

      expect(r.value).toBe(0)
      expect(r.value).not.toBeNull()
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
    })
  })
})
