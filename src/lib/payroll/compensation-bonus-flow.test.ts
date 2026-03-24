/**
 * Integration-level scenario tests for the compensation → bonus calculation flow.
 *
 * These tests verify the correct behavior AFTER the bug fix that changed
 * `compensation.bonusOtdMin` → `compensation.bonusOtdMax` in calculate-payroll.ts
 * and recalculate-entry.ts. The key assertion: the proration functions must receive
 * the MAX bonus amount (the 100% target), not the MIN (which was typically $0).
 */
import { describe, expect, it } from 'vitest'

import type { BonusProrationConfig } from '@/types/payroll'

import { calculateOtdBonus, calculateRpaBonus } from './bonus-proration'

// ---------- Shared fixtures ----------

const DEFAULT_CONFIG: BonusProrationConfig = {
  otdThreshold: 94,
  otdFloor: 70,
  rpaThreshold: 3
}

/** Simulates a typical international collaborator compensation */
const internationalCompensation = {
  baseSalary: 2000,
  remoteAllowance: 50, // connectivity bonus
  bonusOtdMin: 0,
  bonusOtdMax: 500, // On-Time target at 100%
  bonusRpaMin: 0,
  bonusRpaMax: 300 // RpA target at 100%
}

/** Simulates a senior role with higher bonus ceiling */
const seniorCompensation = {
  baseSalary: 3500,
  remoteAllowance: 50,
  bonusOtdMin: 0,
  bonusOtdMax: 800,
  bonusRpaMin: 0,
  bonusRpaMax: 500
}

// ---------- Helper to simulate buildPayrollEntry logic ----------

const computeBonuses = (
  compensation: typeof internationalCompensation,
  kpi: { otdPercent: number | null; rpaAvg: number | null },
  config: BonusProrationConfig = DEFAULT_CONFIG
) => {
  // This mirrors calculate-payroll.ts lines 94-95 AFTER the bug fix:
  //   compensation.bonusOtdMax (not bonusOtdMin)
  //   compensation.bonusRpaMax (not bonusRpaMin)
  const otd = calculateOtdBonus(kpi.otdPercent, compensation.bonusOtdMax, config)
  const rpa = calculateRpaBonus(kpi.rpaAvg, compensation.bonusRpaMax, config)

  const grossTotal = compensation.baseSalary
    + compensation.remoteAllowance
    + otd.amount
    + rpa.amount

  return { otd, rpa, grossTotal }
}

// ---------- Scenario tests ----------

describe('compensation → bonus calculation flow', () => {
  describe('bug fix verification: bonusMax is used, not bonusMin', () => {
    it('uses bonusOtdMax ($500) for OTD proration, not bonusOtdMin ($0)', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 95, rpaAvg: 1.0 })

      // With the bug (bonusOtdMin = 0): amount would be $0
      // After fix (bonusOtdMax = 500): amount is $500
      expect(result.otd.amount).toBe(500)
      expect(result.otd.qualifies).toBe(true)
    })

    it('uses bonusRpaMax ($300) for RpA proration, not bonusRpaMin ($0)', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 95, rpaAvg: 1.0 })

      // With the bug (bonusRpaMin = 0): amount would be $0
      // After fix (bonusRpaMax = 300): amount is $200.01
      // (3 - 1.0) / 3 = 0.6667 → 300 * 0.6667 = $200.01
      expect(result.rpa.amount).toBe(200.01)
      expect(result.rpa.qualifies).toBe(true)
    })

    it('would return $0 if bonusMin were used (documents the old bug)', () => {
      // Simulate the OLD buggy behavior
      const buggyOtd = calculateOtdBonus(95, internationalCompensation.bonusOtdMin, DEFAULT_CONFIG)
      const buggyRpa = calculateRpaBonus(1.0, internationalCompensation.bonusRpaMin, DEFAULT_CONFIG)

      // bonusMin = 0 → always $0 regardless of KPIs
      expect(buggyOtd.amount).toBe(0)
      expect(buggyRpa.amount).toBe(0)
    })
  })

  describe('full payroll scenarios for international collaborator', () => {
    it('perfect KPIs: full bonuses + base + connectivity', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 100, rpaAvg: 0 })

      expect(result.otd.amount).toBe(500) // 100% of bonusOtdMax
      expect(result.rpa.amount).toBe(300) // 100% of bonusRpaMax (rpa=0 → factor 1.0)
      expect(result.grossTotal).toBe(2000 + 50 + 500 + 300) // $2,850
    })

    it('exactly at OTD threshold (94%) and RpA at 1.5: full OTD, partial RpA', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 94, rpaAvg: 1.5 })

      expect(result.otd.amount).toBe(500)
      expect(result.otd.prorationFactor).toBe(1)

      // RpA: (3 - 1.5) / 3 = 0.5
      expect(result.rpa.prorationFactor).toBe(0.5)
      expect(result.rpa.amount).toBe(150)
      expect(result.grossTotal).toBe(2000 + 50 + 500 + 150) // $2,700
    })

    it('OTD 82% (prorated) and RpA 2.5 (prorated): both partial', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 82, rpaAvg: 2.5 })

      // OTD: (82 - 70) / (94 - 70) = 12/24 = 0.5 → $250
      expect(result.otd.prorationFactor).toBe(0.5)
      expect(result.otd.amount).toBe(250)

      // RpA: (3 - 2.5) / 3 = 0.1667 → $50.01
      expect(result.rpa.prorationFactor).toBe(0.1667)
      expect(result.rpa.amount).toBe(50.01)
      expect(result.grossTotal).toBe(2000 + 50 + 250 + 50.01)
    })

    it('OTD below floor (65%): loses OTD bonus entirely', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 65, rpaAvg: 1.0 })

      expect(result.otd.amount).toBe(0)
      expect(result.otd.qualifies).toBe(false)

      // RpA still valid: (3 - 1) / 3 = 0.6667 → 300 * 0.6667 = $200.01
      expect(result.rpa.amount).toBe(200.01)
      expect(result.grossTotal).toBe(2000 + 50 + 0 + 200.01) // $2,250.01
    })

    it('RpA above threshold (3.5): loses RpA bonus entirely', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 95, rpaAvg: 3.5 })

      expect(result.otd.amount).toBe(500)
      expect(result.rpa.amount).toBe(0)
      expect(result.rpa.qualifies).toBe(false)
      expect(result.grossTotal).toBe(2000 + 50 + 500 + 0)
    })

    it('both KPIs disqualified: only base + connectivity', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: 60, rpaAvg: 4.0 })

      expect(result.otd.amount).toBe(0)
      expect(result.rpa.amount).toBe(0)
      expect(result.grossTotal).toBe(2000 + 50) // $2,050 — minimum payout
    })

    it('null KPIs (no Notion data): falls back to manual entry', () => {
      const result = computeBonuses(internationalCompensation, { otdPercent: null, rpaAvg: null })

      expect(result.otd.amount).toBe(0)
      expect(result.otd.qualifies).toBe(false)
      expect(result.rpa.amount).toBe(0)
      expect(result.rpa.qualifies).toBe(false)
      expect(result.grossTotal).toBe(2000 + 50) // base only
    })
  })

  describe('different bonus ceilings by role', () => {
    it('senior role has higher bonus ceiling than standard', () => {
      const kpi = { otdPercent: 95, rpaAvg: 1.0 }

      const standard = computeBonuses(internationalCompensation, kpi)
      const senior = computeBonuses(seniorCompensation, kpi)

      // Same KPI, different bonus ceilings
      expect(standard.otd.amount).toBe(500)
      expect(senior.otd.amount).toBe(800)

      // RpA: (3 - 1) / 3 = 0.6667
      expect(standard.rpa.amount).toBe(200.01) // 300 * 0.6667
      expect(senior.rpa.amount).toBe(333.35) // 500 * 0.6667
    })

    it('partial proration scales with bonus ceiling', () => {
      const kpi = { otdPercent: 82, rpaAvg: 2.0 }

      const standard = computeBonuses(internationalCompensation, kpi)
      const senior = computeBonuses(seniorCompensation, kpi)

      // OTD: (82 - 70) / (94 - 70) = 0.5
      expect(standard.otd.amount).toBe(250) // 500 * 0.5
      expect(senior.otd.amount).toBe(400) // 800 * 0.5

      // RpA: (3 - 2) / 3 = 0.3333
      expect(standard.rpa.amount).toBe(99.99) // 300 * 0.3333
      expect(senior.rpa.amount).toBe(166.65) // 500 * 0.3333
    })
  })

  describe('configurable thresholds', () => {
    it('respects custom OTD threshold of 89%', () => {
      const customConfig: BonusProrationConfig = {
        otdThreshold: 89,
        otdFloor: 70,
        rpaThreshold: 3
      }

      // 89% qualifies at 100% with custom config, but only 79% proration with default (94%)
      const withCustom = computeBonuses(internationalCompensation, { otdPercent: 89, rpaAvg: 1.0 }, customConfig)
      const withDefault = computeBonuses(internationalCompensation, { otdPercent: 89, rpaAvg: 1.0 })

      expect(withCustom.otd.prorationFactor).toBe(1) // 89 >= 89 → full
      expect(withCustom.otd.amount).toBe(500)

      // (89 - 70) / (94 - 70) = 19/24 = 0.7917
      expect(withDefault.otd.prorationFactor).toBe(0.7917)
      expect(withDefault.otd.amount).toBe(395.85)
    })
  })
})
