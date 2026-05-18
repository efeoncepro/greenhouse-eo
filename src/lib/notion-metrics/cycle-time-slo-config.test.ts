import { describe, expect, it } from 'vitest'

import {
  CT_SLO_PCT_FORMULA_VERSION,
  CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS,
  CYCLE_TIME_SLO_THRESHOLDS_PER_TASK_TYPE,
  getSLOThreshold,
  isWithinSLO
} from './cycle-time-slo-config'

describe('getSLOThreshold (TASK-908 / CT_SLO_PCT_V1)', () => {
  it('returns DEFAULT 14.2 cuando taskType es undefined', () => {
    expect(getSLOThreshold()).toBe(14.2)
  })

  it('returns DEFAULT 14.2 cuando taskType es null', () => {
    expect(getSLOThreshold(null)).toBe(14.2)
  })

  it('returns DEFAULT cuando taskType no está calibrado (V1 ignora taskType)', () => {
    expect(getSLOThreshold('video_largo')).toBe(14.2)
    expect(getSLOThreshold('banner')).toBe(14.2)
  })

  it('CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS canonical = 14.2', () => {
    expect(CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS).toBe(14.2)
  })

  it('V1 thresholds map per task type está empty (V2 activará)', () => {
    expect(Object.keys(CYCLE_TIME_SLO_THRESHOLDS_PER_TASK_TYPE)).toHaveLength(0)
  })
})

describe('isWithinSLO (TASK-908 / CT_SLO_PCT_V1)', () => {
  it('returns true cuando cycleTimeDays < threshold', () => {
    expect(isWithinSLO(10)).toBe(true)
  })

  it('returns true en boundary (cycleTimeDays === threshold)', () => {
    expect(isWithinSLO(14.2)).toBe(true)
  })

  it('returns false cuando cycleTimeDays > threshold', () => {
    expect(isWithinSLO(15)).toBe(false)
    expect(isWithinSLO(20)).toBe(false)
  })

  it('returns false cuando cycleTimeDays es null', () => {
    expect(isWithinSLO(null)).toBe(false)
  })

  it('returns false cuando cycleTimeDays es undefined', () => {
    expect(isWithinSLO(undefined)).toBe(false)
  })

  it('returns true cuando cycleTimeDays = 0 (entrega instantánea)', () => {
    expect(isWithinSLO(0)).toBe(true)
  })

  it('V1 taskType es ignorado (default uniforme 14.2)', () => {
    expect(isWithinSLO(15, 'banner')).toBe(false) // 15 > 14.2
    expect(isWithinSLO(20, 'video_largo')).toBe(false) // V1 NO calibra
  })
})

describe('CT_SLO_PCT_FORMULA_VERSION', () => {
  it('canonical V1 version constant', () => {
    expect(CT_SLO_PCT_FORMULA_VERSION).toBe('ct_slo_pct_v1.0')
  })
})
