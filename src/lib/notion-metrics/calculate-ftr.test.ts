import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RpaV2DataStatus, RpaV2Result, RpaV2SourceMode } from './calculate-rpa-v2'

const mocks = vi.hoisted(() => ({
  calculateRpaV2: vi.fn()
}))

vi.mock('./calculate-rpa-v2', () => ({
  calculateRpaV2: mocks.calculateRpaV2,
  RPA_FORMULA_VERSION: 'rpa_v2.0'
}))

import { calculateFtr, FTR_FORMULA_VERSION } from './calculate-ftr'

beforeEach(() => {
  mocks.calculateRpaV2.mockReset()
})

const TASK_ID = 'notion-page-uuid-ftr-001'

// Helper canonical: build RpaV2Result mock con shape completo (espejo del
// contrato de calculate-rpa-v2.ts). Default sourceMode/dataStatus coherentes.
const rpaResult = (
  value: number | null,
  dataStatus: RpaV2DataStatus = 'valid',
  sourceMode: RpaV2SourceMode = 'canonical'
): RpaV2Result => ({
  value,
  dataStatus,
  sourceMode,
  inputsUsed: {
    taskSourceId: TASK_ID,
    correctionTransitionsCount: value ?? 0,
    windowStart: null,
    windowEnd: null
  },
  formulaVersion: 'rpa_v2.0'
})

describe('calculateFtr — TASK-909 Slice 1 canonical V1 (delegación pura a calculateRpaV2)', () => {
  describe('Happy paths — veredicto pass/fail', () => {
    // Test 1 spec §4.2
    it('RpA=0 → FTR pass, dataStatus=valid', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(0))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBe('pass')
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.formulaVersion).toBe(FTR_FORMULA_VERSION)
      expect(r.rpaSnapshot.value).toBe(0)
    })

    // Test 2 spec §4.2
    it('RpA=1 → FTR fail, dataStatus=valid', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(1))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBe('fail')
      expect(r.dataStatus).toBe('valid')
      expect(r.sourceMode).toBe('canonical')
      expect(r.rpaSnapshot.value).toBe(1)
    })

    // Test 3 spec §4.2
    it('RpA=5 (múltiples correcciones) → FTR fail', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(5))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBe('fail')
      expect(r.dataStatus).toBe('valid')
    })
  })

  describe('Edge cases — no computable → null + unavailable', () => {
    // Test 4 spec §4.2
    it('RpA dataStatus=unavailable → FTR null, dataStatus=unavailable', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(null, 'unavailable', 'unavailable'))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
      expect(r.sourceMode).toBe('unavailable')
      expect(r.rpaSnapshot.dataStatus).toBe('unavailable')
    })

    // Test 5 spec §4.2
    it('RpA value=null → FTR null, dataStatus=unavailable', async () => {
      // value=null pero dataStatus reportado valid (defensa: el guard de value
      // null dispara igual el path unavailable). Null-not-zero contract.
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(null, 'valid', 'canonical'))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
    })

    // Test 6 spec §4.2
    it('RpA dataStatus=suppressed (con value no-nulo) → FTR null, dataStatus=unavailable', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(0, 'suppressed', 'canonical'))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      // No se computa pass/fail sobre data suprimida — degradación honesta.
      expect(r.value).toBeNull()
      expect(r.dataStatus).toBe('unavailable')
    })
  })

  describe('Low confidence — señal propagada, no colapsada', () => {
    // Test 7 spec §4.2
    it('RpA dataStatus=low_confidence, value=0 → FTR pass, dataStatus=low_confidence', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(0, 'low_confidence', 'canonical'))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBe('pass')
      // El caveat low_confidence se propaga (NO se colapsa a valid).
      expect(r.dataStatus).toBe('low_confidence')
      expect(r.sourceMode).toBe('canonical')
    })

    it('RpA dataStatus=low_confidence, value=2 → FTR fail, dataStatus=low_confidence', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(2, 'low_confidence', 'canonical'))

      const r = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r.value).toBe('fail')
      expect(r.dataStatus).toBe('low_confidence')
    })
  })

  describe('Window filter propagation', () => {
    // Test 8 spec §4.2
    it('window se propaga a calculateRpaV2', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(0))

      const windowStart = new Date('2026-05-01T00:00:00Z')
      const windowEnd = new Date('2026-05-31T23:59:59Z')

      await calculateFtr({ taskSourceId: TASK_ID, windowStart, windowEnd })

      expect(mocks.calculateRpaV2).toHaveBeenCalledWith(
        expect.objectContaining({ taskSourceId: TASK_ID, windowStart, windowEnd })
      )
    })
  })

  describe('Forward-compat Frame.io', () => {
    // Test 9 spec §4.2
    it('clientReviewOpen se propaga a calculateRpaV2 (que hoy lo ignora) → mismo result + rpaSnapshot preservado', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(0))

      const r = await calculateFtr({
        taskSourceId: TASK_ID,
        clientReviewOpen: true,
        workflowReviewOpen: false,
        openFrameComments: 5,
        // handoffArtifactPresent NO se propaga (RpA V2 aún no lo acepta).
        handoffArtifactPresent: true
      })

      expect(r.value).toBe('pass')
      expect(mocks.calculateRpaV2).toHaveBeenCalledWith(
        expect.objectContaining({
          taskSourceId: TASK_ID,
          clientReviewOpen: true,
          workflowReviewOpen: false,
          openFrameComments: 5
        })
      )
      // handoffArtifactPresent NUNCA propagado al RpA helper.
      const callArg = mocks.calculateRpaV2.mock.calls[0][0]

      expect(callArg).not.toHaveProperty('handoffArtifactPresent')
      // rpaSnapshot preservado para forensic/debugging downstream.
      expect(r.rpaSnapshot).toBeDefined()
      expect(r.rpaSnapshot.formulaVersion).toBe('rpa_v2.0')
    })
  })

  describe('Formula version + idempotencia canonical', () => {
    it('FTR_FORMULA_VERSION === ftr_v1.0 (anti-regresión, desacoplado de rpa_v2.0)', () => {
      expect(FTR_FORMULA_VERSION).toBe('ftr_v1.0')
    })

    it('result siempre incluye formulaVersion canonical (valid + unavailable paths)', async () => {
      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(0))
      const valid = await calculateFtr({ taskSourceId: TASK_ID })

      expect(valid.formulaVersion).toBe('ftr_v1.0')

      mocks.calculateRpaV2.mockResolvedValueOnce(rpaResult(null, 'unavailable', 'unavailable'))
      const unavailable = await calculateFtr({ taskSourceId: TASK_ID })

      expect(unavailable.formulaVersion).toBe('ftr_v1.0')
    })

    it('2 invocaciones con mismos inputs → mismo result', async () => {
      mocks.calculateRpaV2.mockResolvedValue(rpaResult(0))

      const r1 = await calculateFtr({ taskSourceId: TASK_ID })
      const r2 = await calculateFtr({ taskSourceId: TASK_ID })

      expect(r1).toEqual(r2)
      expect(r1.value).toBe('pass')
    })
  })
})
