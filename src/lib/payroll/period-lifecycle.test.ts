import { describe, expect, it } from 'vitest'

import type { PeriodStatus } from '@/types/payroll'

import {
  canEditPayrollPeriodMetadata,
  canEditPayrollEntries,
  canRecalculatePayrollPeriod,
  canReopenPayrollPeriod,
  canSetPayrollPeriodApproved,
  canSetPayrollPeriodCalculated,
  canSetPayrollPeriodExported,
  doesPayrollPeriodUpdateRequireReset,
  isPayrollPeriodFinalized,
  isPayrollPeriodReopened,
  isReopenedRecomputeBlockedByParticipationWindow,
  shouldReopenApprovedPayrollPeriod
} from './period-lifecycle'

describe('payroll period lifecycle', () => {
  it('allows calculation for draft, calculated, and approved periods', () => {
    expect(canSetPayrollPeriodCalculated('draft')).toBe(true)
    expect(canSetPayrollPeriodCalculated('calculated')).toBe(true)
    expect(canSetPayrollPeriodCalculated('approved')).toBe(true)
    expect(canSetPayrollPeriodCalculated('exported')).toBe(false)
  })

  it('only allows approval from the calculated state', () => {
    expect(canSetPayrollPeriodApproved('draft')).toBe(false)
    expect(canSetPayrollPeriodApproved('calculated')).toBe(true)
    expect(canSetPayrollPeriodApproved('approved')).toBe(false)
    expect(canSetPayrollPeriodApproved('exported')).toBe(false)
  })

  it('only allows export from the approved state', () => {
    expect(canSetPayrollPeriodExported('draft')).toBe(false)
    expect(canSetPayrollPeriodExported('calculated')).toBe(false)
    expect(canSetPayrollPeriodExported('approved')).toBe(true)
    expect(canSetPayrollPeriodExported('exported')).toBe(false)
  })

  it('allows recalculation for draft, calculated, and approved periods', () => {
    expect(canRecalculatePayrollPeriod('draft')).toBe(true)
    expect(canRecalculatePayrollPeriod('calculated')).toBe(true)
    expect(canRecalculatePayrollPeriod('approved')).toBe(true)
  })

  it('treats exported periods as finalized', () => {
    expect(isPayrollPeriodFinalized('exported')).toBe(true)
    expect(canRecalculatePayrollPeriod('exported')).toBe(false)
  })

  it('allows entry editing while calculated or reopened', () => {
    expect(canEditPayrollEntries('calculated')).toBe(true)
    expect(canEditPayrollEntries('reopened')).toBe(true)
    expect(canEditPayrollEntries('approved')).toBe(false)
    expect(canEditPayrollEntries('draft')).toBe(false)
    expect(canEditPayrollEntries('exported')).toBe(false)
  })

  it('allows metadata editing until the period is exported', () => {
    expect(canEditPayrollPeriodMetadata('draft')).toBe(true)
    expect(canEditPayrollPeriodMetadata('calculated')).toBe(true)
    expect(canEditPayrollPeriodMetadata('approved')).toBe(true)
    expect(canEditPayrollPeriodMetadata('exported')).toBe(false)
  })

  it('reopens approved periods to calculated after a manual mutation', () => {
    expect(shouldReopenApprovedPayrollPeriod('approved')).toBe(true)
    expect(shouldReopenApprovedPayrollPeriod('calculated')).toBe(false)
    expect(shouldReopenApprovedPayrollPeriod('exported')).toBe(false)
  })

  // TASK-410 — reopen of exported periods for reliquidación.
  describe('reopened state (TASK-410)', () => {
    it('canReopenPayrollPeriod only allows transition from exported', () => {
      expect(canReopenPayrollPeriod('exported')).toBe(true)
      expect(canReopenPayrollPeriod('draft')).toBe(false)
      expect(canReopenPayrollPeriod('calculated')).toBe(false)
      expect(canReopenPayrollPeriod('approved')).toBe(false)
      expect(canReopenPayrollPeriod('reopened')).toBe(false)
    })

    it('isPayrollPeriodReopened is exclusive to the new state', () => {
      expect(isPayrollPeriodReopened('reopened')).toBe(true)
      expect(isPayrollPeriodReopened('exported')).toBe(false)
      expect(isPayrollPeriodReopened('approved')).toBe(false)
    })

    it('reopened periods are NOT finalized so recalc is allowed', () => {
      expect(isPayrollPeriodFinalized('reopened')).toBe(false)
      expect(canRecalculatePayrollPeriod('reopened')).toBe(true)
    })

    it('canSetPayrollPeriodCalculated accepts reopened as a valid source', () => {
      expect(canSetPayrollPeriodCalculated('reopened')).toBe(true)
    })
  })

  it('requires resetting calculated data when month, year, uf, or tax table changes', () => {
    expect(
      doesPayrollPeriodUpdateRequireReset({
        currentYear: 2026,
        currentMonth: 3,
        currentUfValue: 39000,
        currentTaxTableVersion: 'SII-2026-03',
        nextYear: 2026,
        nextMonth: 2,
        nextUfValue: 39000,
        nextTaxTableVersion: 'SII-2026-03'
      })
    ).toBe(true)

    expect(
      doesPayrollPeriodUpdateRequireReset({
        currentYear: 2026,
        currentMonth: 3,
        currentUfValue: 39000,
        currentTaxTableVersion: 'SII-2026-03',
        nextYear: 2026,
        nextMonth: 3,
        nextUfValue: 39100,
        nextTaxTableVersion: 'SII-2026-03'
      })
    ).toBe(true)

    expect(
      doesPayrollPeriodUpdateRequireReset({
        currentYear: 2026,
        currentMonth: 3,
        currentUfValue: 39000,
        currentTaxTableVersion: 'SII-2026-03',
        nextYear: 2026,
        nextMonth: 3,
        nextUfValue: 39000,
        nextTaxTableVersion: 'SII-2026-03'
      })
    ).toBe(false)
  })

  /*
   * TASK-893 Slice 4 BL-5 — Reopened recompute guard under participation window.
   *
   * Predicate must return TRUE only when BOTH conditions hold:
   *   - period.status === 'reopened'
   *   - PAYROLL_PARTICIPATION_WINDOW_ENABLED === true
   *
   * Any other combination MUST return FALSE so the legacy reopened recompute
   * path (TASK-410) keeps working bit-for-bit when the new flag is OFF.
   */
  describe('isReopenedRecomputeBlockedByParticipationWindow (BL-5)', () => {
    it('blocks when status=reopened AND flag enabled', () => {
      expect(isReopenedRecomputeBlockedByParticipationWindow('reopened', true)).toBe(true)
    })

    it('does NOT block when flag is disabled, regardless of status', () => {
      ;(['draft', 'calculated', 'approved', 'exported', 'reopened'] as PeriodStatus[]).forEach(s => {
        expect(isReopenedRecomputeBlockedByParticipationWindow(s, false)).toBe(false)
      })
    })

    it('does NOT block non-reopened statuses when flag is enabled', () => {
      ;(['draft', 'calculated', 'approved', 'exported'] as PeriodStatus[]).forEach(s => {
        expect(isReopenedRecomputeBlockedByParticipationWindow(s, true)).toBe(false)
      })
    })

    /*
     * Invariante crítica: cuando TASK-893 flag está OFF (default productivo),
     * reopened recompute SIGUE PERMITIDO bit-for-bit con el comportamiento
     * legacy. Sin esta invariante, el guard rompería el flujo TASK-410
     * reliquidación.
     */
    it('preserves legacy TASK-410 reopened recompute path bit-for-bit (flag OFF default)', () => {
      expect(isReopenedRecomputeBlockedByParticipationWindow('reopened', false)).toBe(false)
    })

    /*
     * TASK-895 escape hatch — el predicate sigue devolviendo true porque el
     * escape hatch vive UPSTREAM en `calculatePayroll` (acepta
     * forceRecomputeReason >= 20 chars cuando la capability ya fue validada
     * por el admin endpoint). Este test pinea que el predicate canonical NO
     * conoce del escape hatch — es responsabilidad del caller.
     */
    it('does NOT know about force_recompute escape hatch (predicate stays pure)', () => {
      expect(isReopenedRecomputeBlockedByParticipationWindow('reopened', true)).toBe(true)
    })
  })
})
