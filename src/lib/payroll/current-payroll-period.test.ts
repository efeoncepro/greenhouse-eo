import { describe, expect, it } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import {
  getActivePayrollPeriods,
  getCurrentPayrollPeriod,
  getNextPayrollPeriodSuggestion,
  getPayrollCalculationDeadlineStatus,
  sortPayrollPeriodsDescending
} from './current-payroll-period'

const buildPeriod = (
  periodId: string,
  status: PayrollPeriod['status']
): PayrollPeriod => {
  const [year, month] = periodId.split('-').map(Number)

  return {
    periodId,
    year,
    month,
    status,
    calculatedAt: null,
    calculatedBy: null,
    approvedAt: null,
    approvedBy: null,
    exportedAt: null,
    ufValue: null,
    taxTableVersion: null,
    notes: null,
    createdAt: null
  }
}

describe('current-payroll-period helpers', () => {
  it('sorts periods descending by year and month', () => {
    const sorted = sortPayrollPeriodsDescending([
      buildPeriod('2026-02', 'approved'),
      buildPeriod('2026-04', 'draft'),
      buildPeriod('2025-12', 'exported')
    ])

    expect(sorted.map(period => period.periodId)).toEqual(['2026-04', '2026-02', '2025-12'])
  })

  it('returns the matching operational month when it is still open', () => {
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'approved'),
        buildPeriod('2026-03', 'draft')
      ],
      '2026-03-28T12:00:00.000Z'
    )

    expect(current?.periodId).toBe('2026-03')
  })

  it('surfaces an earlier approved period when the current operational month is already exported', () => {
    // Semantic change (TASK-409): the legacy behavior returned null here,
    // which silently hid a period that was approved but never exported.
    // Losing track of a pending export is a real incident risk, so the
    // active periods model now surfaces it as `approved_pending_export`.
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'approved'),
        buildPeriod('2026-03', 'exported')
      ],
      '2026-03-28T12:00:00.000Z'
    )

    expect(current?.periodId).toBe('2026-02')
  })

  it('returns null when every period is either exported or non-active', () => {
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'exported'),
        buildPeriod('2026-03', 'exported')
      ],
      '2026-03-28T12:00:00.000Z'
    )

    expect(current).toBeNull()
  })

  it('rolls back to the prior month while the close window is still open', () => {
    const current = getCurrentPayrollPeriod(
      [
        buildPeriod('2026-02', 'approved'),
        buildPeriod('2026-03', 'draft')
      ],
      '2026-04-08T02:00:00.000Z'
    )

    expect(current?.periodId).toBe('2026-03')
  })

  it('computes deadline state for an uncalculated period on its last business day', () => {
    const status = getPayrollCalculationDeadlineStatus(
      buildPeriod('2026-03', 'draft'),
      '2026-03-31T15:00:00.000Z'
    )

    expect(status.deadlineDate).toBe('2026-03-31')
    expect(status.isDue).toBe(true)
    expect(status.state).toBe('due')
  })

  it('detects when a period was calculated on time', () => {
    const status = getPayrollCalculationDeadlineStatus(
      {
        ...buildPeriod('2026-03', 'calculated'),
        calculatedAt: '2026-03-31T13:00:00.000Z'
      },
      '2026-04-01T12:00:00.000Z'
    )

    expect(status.calculatedOnTime).toBe(true)
    expect(status.state).toBe('calculated_on_time')
  })

  it('suggests the next period after the latest existing one', () => {
    const suggestion = getNextPayrollPeriodSuggestion([
      buildPeriod('2026-03', 'exported')
    ])

    expect(suggestion).toEqual({ year: 2026, month: 4 })
  })

  it('rolls over december to january', () => {
    const suggestion = getNextPayrollPeriodSuggestion([
      buildPeriod('2026-12', 'approved')
    ])

    expect(suggestion).toEqual({ year: 2027, month: 1 })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Active periods model (TASK-409 — multi-period awareness)
  // ──────────────────────────────────────────────────────────────────────
  describe('getActivePayrollPeriods', () => {
    it('returns empty when every period is exported', () => {
      const active = getActivePayrollPeriods(
        [buildPeriod('2026-02', 'exported'), buildPeriod('2026-03', 'exported')],
        '2026-04-15T12:00:00.000Z'
      )

      expect(active).toEqual([])
    })

    it('classifies the operational-month period as current_operational_month', () => {
      const active = getActivePayrollPeriods(
        [buildPeriod('2026-02', 'exported'), buildPeriod('2026-03', 'calculated')],
        '2026-03-28T12:00:00.000Z'
      )

      expect(active).toHaveLength(1)
      expect(active[0]?.period.periodId).toBe('2026-03')
      expect(active[0]?.reason).toBe('current_operational_month')
    })

    it('promotes a reopened period above the operational-month period', () => {
      const active = getActivePayrollPeriods(
        [
          buildPeriod('2026-03', 'reopened'),
          buildPeriod('2026-04', 'draft')
        ],
        '2026-04-15T12:00:00.000Z'
      )

      expect(active.map(entry => entry.period.periodId)).toEqual(['2026-03', '2026-04'])
      expect(active[0]?.reason).toBe('reopened_for_reliquidation')
      expect(active[1]?.reason).toBe('current_operational_month')
    })

    it('keeps an approved prior month visible as approved_pending_export', () => {
      const active = getActivePayrollPeriods(
        [
          buildPeriod('2026-02', 'approved'),
          buildPeriod('2026-03', 'draft')
        ],
        '2026-03-28T12:00:00.000Z'
      )

      // Current operational month first, then the prior approved month.
      expect(active.map(entry => entry.reason)).toEqual([
        'current_operational_month',
        'approved_pending_export'
      ])
      expect(active[0]?.period.periodId).toBe('2026-03')
      expect(active[1]?.period.periodId).toBe('2026-02')
    })

    it('surfaces future drafts as future_draft (lowest priority)', () => {
      const active = getActivePayrollPeriods(
        [
          buildPeriod('2026-04', 'calculated'),
          buildPeriod('2026-05', 'draft')
        ],
        '2026-04-15T12:00:00.000Z'
      )

      expect(active.map(entry => entry.reason)).toEqual([
        'current_operational_month',
        'future_draft'
      ])
    })

    it('hides a prior draft/calculated period that is not approved and not the operational month', () => {
      // A prior month left in draft is noise — it didn't progress, and it's
      // not the current cycle. Hide it from the active surface.
      const active = getActivePayrollPeriods(
        [
          buildPeriod('2026-02', 'draft'),
          buildPeriod('2026-03', 'draft')
        ],
        '2026-03-28T12:00:00.000Z'
      )

      expect(active.map(entry => entry.period.periodId)).toEqual(['2026-03'])
    })

    it('handles the real reliquidación case: Marzo reopened while Abril has no period yet', () => {
      // Reproduces the production scenario on 2026-04-15 that surfaced this
      // bug: Marzo was reopened for reliquidación, Abril had not been
      // created yet, and the UI showed "No hay período abierto" because the
      // legacy lookup only matched the operational month.
      const active = getActivePayrollPeriods(
        [
          buildPeriod('2026-02', 'exported'),
          buildPeriod('2026-03', 'reopened')
        ],
        '2026-04-15T12:00:00.000Z'
      )

      expect(active).toHaveLength(1)
      expect(active[0]?.period.periodId).toBe('2026-03')
      expect(active[0]?.reason).toBe('reopened_for_reliquidation')
    })

    it('picks the most recent period when two share the same priority bucket', () => {
      const active = getActivePayrollPeriods(
        [
          buildPeriod('2026-01', 'approved'),
          buildPeriod('2026-02', 'approved')
        ],
        '2026-04-15T12:00:00.000Z'
      )

      expect(active.map(entry => entry.period.periodId)).toEqual(['2026-02', '2026-01'])
      expect(active.every(entry => entry.reason === 'approved_pending_export')).toBe(true)
    })
  })

  describe('getCurrentPayrollPeriod (legacy single-period accessor)', () => {
    it('returns the top-priority active period via getActivePayrollPeriods', () => {
      const period = getCurrentPayrollPeriod(
        [
          buildPeriod('2026-03', 'reopened'),
          buildPeriod('2026-04', 'draft')
        ],
        '2026-04-15T12:00:00.000Z'
      )

      expect(period?.periodId).toBe('2026-03')
    })

    it('returns null when nothing is active', () => {
      const period = getCurrentPayrollPeriod(
        [buildPeriod('2026-03', 'exported')],
        '2026-03-28T12:00:00.000Z'
      )

      expect(period).toBeNull()
    })
  })
})
