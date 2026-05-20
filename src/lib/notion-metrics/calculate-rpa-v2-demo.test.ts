import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  countCorrectionTransitionsDemo: vi.fn()
}))

vi.mock('./count-correction-transitions-demo', () => ({
  countCorrectionTransitionsDemo: mocks.countCorrectionTransitionsDemo
}))

import { calculateRpaV2Demo } from './calculate-rpa-v2-demo'
import { RPA_FORMULA_VERSION } from './calculate-rpa-v2'

beforeEach(() => {
  mocks.countCorrectionTransitionsDemo.mockReset()
})

const TASK_ID = 'demo-task-uuid-001'

const transitionsResult = (
  count: number,
  sourceMode: 'canonical' | 'unavailable' = 'canonical'
) => ({
  count,
  sourceMode,
  transitions: Array.from({ length: count }, (_, idx) => ({
    transitionedAt: new Date(`2026-05-19T0${idx}:00:00Z`),
    transitionedBy: `notion-demo-user-${idx}`
  }))
})

describe('calculateRpaV2Demo — TASK-913 Slice 1 canonical (demo carril paralelo)', () => {
  describe('Happy paths — sourceMode canonical (demo table)', () => {
    it('0 transitions canonical → value=0, dataStatus=valid', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(0))

      const r = await calculateRpaV2Demo({ taskSourceId: TASK_ID })

      expect(r.value).toBe(0)
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.inputsUsed.correctionTransitionsCount).toBe(0)
      expect(r.inputsUsed.taskSourceId).toBe(TASK_ID)
      expect(r.formulaVersion).toBe(RPA_FORMULA_VERSION)
    })

    it('N transitions → value=N (idéntica semántica al sibling productive)', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(3))

      const r = await calculateRpaV2Demo({ taskSourceId: TASK_ID })

      expect(r.value).toBe(3)
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
    })
  })

  describe('Unavailable mode — null-not-zero contract canonical', () => {
    it('sourceMode=unavailable → value=null + dataStatus=unavailable', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(0, 'unavailable'))

      const r = await calculateRpaV2Demo({ taskSourceId: TASK_ID })

      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
      expect(r.sourceMode).toBe('unavailable')
      expect(r.inputsUsed.correctionTransitionsCount).toBe(0)
    })
  })

  describe('Defense in depth — delega a foundation helper demo (NUNCA productive)', () => {
    it('invoca countCorrectionTransitionsDemo, NUNCA countCorrectionTransitions productive', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(1))

      await calculateRpaV2Demo({ taskSourceId: TASK_ID })

      expect(mocks.countCorrectionTransitionsDemo).toHaveBeenCalledWith({
        taskSourceId: TASK_ID,
        windowStart: undefined,
        windowEnd: undefined
      })
    })

    it('passes through windowStart/windowEnd cuando provided', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(2))

      const start = new Date('2026-05-01T00:00:00Z')
      const end = new Date('2026-05-31T23:59:59Z')

      await calculateRpaV2Demo({
        taskSourceId: TASK_ID,
        windowStart: start,
        windowEnd: end
      })

      expect(mocks.countCorrectionTransitionsDemo).toHaveBeenCalledWith({
        taskSourceId: TASK_ID,
        windowStart: start,
        windowEnd: end
      })
    })
  })

  describe('Forward-compat V3 (Frame.io integration future)', () => {
    it('ignora silenciosamente clientReviewOpen/workflowReviewOpen/openFrameComments', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(1))

      const r = await calculateRpaV2Demo({
        taskSourceId: TASK_ID,
        clientReviewOpen: true,
        workflowReviewOpen: false,
        openFrameComments: 5
      })

      expect(r.value).toBe(1)
      expect(r.dataStatus).toBe('valid')
    })
  })

  describe('Edge case: empty taskSourceId delegado al foundation helper', () => {
    it('foundation helper retorna unavailable → mapper a value=null', async () => {
      mocks.countCorrectionTransitionsDemo.mockResolvedValueOnce(transitionsResult(0, 'unavailable'))

      const r = await calculateRpaV2Demo({ taskSourceId: '' })

      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
    })
  })
})
