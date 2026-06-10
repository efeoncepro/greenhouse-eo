import { describe, expect, it } from 'vitest'

import {
  CSC_PHASE_ORDER,
  QUALITY_PENDING_METRIC_IDS,
  TREND_CONFIG,
  getZoneColor,
  isPendingClosures,
  normalizeForRadar
} from '@/lib/ico-engine/activity-presentation'

describe('activity-presentation shared primitives (TASK-1027)', () => {
  describe('normalizeForRadar', () => {
    it('returns 0 for null', () => {
      expect(normalizeForRadar('otd_pct', null)).toBe(0)
      expect(normalizeForRadar('rpa', null)).toBe(0)
    })

    it('passes percent metrics straight through, clamped to 100', () => {
      expect(normalizeForRadar('otd_pct', 86)).toBe(86)
      expect(normalizeForRadar('ftr_pct', 120)).toBe(100)
    })

    it('inverts RpA (lower raw is healthier)', () => {
      expect(normalizeForRadar('rpa', 1)).toBe(100)
      expect(normalizeForRadar('rpa', 3)).toBe(0)
    })

    it('inverts cycle_time (lower raw is healthier)', () => {
      expect(normalizeForRadar('cycle_time', 3)).toBe(100)
      expect(normalizeForRadar('cycle_time', 21)).toBe(0)
    })

    it('returns 0 for unknown metric', () => {
      expect(normalizeForRadar('mystery', 50)).toBe(0)
    })
  })

  describe('isPendingClosures', () => {
    it('is true when there is committed work but no closures', () => {
      expect(isPendingClosures(30, 0)).toBe(true)
    })

    it('is false once closures exist', () => {
      expect(isPendingClosures(30, 24)).toBe(false)
    })

    it('is false with no work', () => {
      expect(isPendingClosures(0, 0)).toBe(false)
    })
  })

  describe('getZoneColor', () => {
    it('maps null zone to secondary', () => {
      expect(getZoneColor(null)).toBe('secondary')
    })
  })

  it('exposes canonical quality-pending metrics + trend + CSC order', () => {
    expect(QUALITY_PENDING_METRIC_IDS.has('otd_pct')).toBe(true)
    expect(QUALITY_PENDING_METRIC_IDS.has('throughput')).toBe(false)
    expect(TREND_CONFIG.map(t => t.id)).toEqual(['otd_pct', 'ftr_pct'])
    expect(CSC_PHASE_ORDER).toEqual([
      'briefing', 'produccion', 'revision_interna', 'cambios_cliente', 'entrega'
    ])
  })
})
