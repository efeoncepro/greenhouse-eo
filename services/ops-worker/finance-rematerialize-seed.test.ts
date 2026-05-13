import { describe, expect, it } from 'vitest'

import {
  computeRematerializeSeedDate,
  computeRollingRematerializationWindow
} from './finance-rematerialize-seed'

/**
 * ISSUE-069 — el cron ops-finance-rematerialize-balances dejaba un día ciego
 * en el límite del lookback. El día seed del rematerializer NO se materializa
 * por contrato canónico (account-balances-rematerialize.ts:258 itera desde
 * `seedDate + 1`). Si el cron usaba `today − lookbackDays` como seed, ese día
 * quedaba como ancla muda — registros retroactivos con esa `transaction_date`
 * NO se contabilizaban.
 *
 * Fix: `seedDate = today − (lookbackDays + 1)`. El día seed sigue siendo
 * ancla, pero ahora es 1 día anterior al window de interés. Los últimos
 * `lookbackDays` días COMPLETOS se materializan.
 *
 * Este test pin-ea el contrato anti-regresión.
 */
describe('computeRematerializeSeedDate — ISSUE-069 fix', () => {
  it('returns today − (lookbackDays + 1) days, not today − lookbackDays', () => {
    const today = new Date('2026-05-08T00:00:00.000Z')

    const seed = computeRematerializeSeedDate(today, 7)

    // ISSUE-069 fix: con lookbackDays=7, hoy=2026-05-08, seed debe ser
    // 2026-04-30 (8 días atrás), NO 2026-05-01 (que era el bug — el día
    // 2026-05-01 quedaba como ancla muda y los movimientos retroactivos en
    // esa fecha no se contabilizaban).
    expect(seed).toBe('2026-04-30')
  })

  it('garantiza que today − lookbackDays SE MATERIALIZA (no es seed)', () => {
    // El día crítico (today − lookbackDays) debe ser day-1 del rematerialize,
    // NO el seed. Como `rematerializeAccountBalanceRange` itera desde
    // `seedDate + 1`, el seed debe ser EXACTAMENTE 1 día antes de today − lookbackDays.
    const today = new Date('2026-05-08T00:00:00.000Z')
    const lookbackDays = 7

    const seed = computeRematerializeSeedDate(today, lookbackDays)

    const firstMaterializedDay = new Date(today.getTime() - lookbackDays * 86_400_000)
      .toISOString().slice(0, 10)

    // seed + 1 día == primer día materializado == today − lookbackDays
    const seedPlusOne = new Date(new Date(seed).getTime() + 86_400_000)
      .toISOString().slice(0, 10)

    expect(seedPlusOne).toBe(firstMaterializedDay)
    expect(firstMaterializedDay).toBe('2026-05-01')
  })

  it('handles lookbackDays=1 (edge case minimal window)', () => {
    const today = new Date('2026-05-08T00:00:00.000Z')

    const seed = computeRematerializeSeedDate(today, 1)

    // seed = today − 2d → materializa solo today − 1d y today
    expect(seed).toBe('2026-05-06')
  })

  it('handles lookbackDays=30 (extended backfill window)', () => {
    const today = new Date('2026-05-08T00:00:00.000Z')

    const seed = computeRematerializeSeedDate(today, 30)

    // seed = today − 31d → materializa today−30d..today (30 días completos)
    expect(seed).toBe('2026-04-07')
  })

  it('returns ISO date string (no time component)', () => {
    const today = new Date('2026-05-08T13:42:55.123Z')

    const seed = computeRematerializeSeedDate(today, 7)

    expect(seed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(seed.length).toBe(10)
  })

  it('crosses month boundary correctly', () => {
    const today = new Date('2026-05-03T00:00:00.000Z')

    const seed = computeRematerializeSeedDate(today, 7)

    // today=2026-05-03, lookback=7 → seed = today−8d = 2026-04-25
    expect(seed).toBe('2026-04-25')
  })

  it('crosses year boundary correctly', () => {
    const today = new Date('2026-01-05T00:00:00.000Z')

    const seed = computeRematerializeSeedDate(today, 7)

    // today=2026-01-05, lookback=7 → seed = today−8d = 2025-12-28
    expect(seed).toBe('2025-12-28')
  })
})

/**
 * TASK-871 — Rolling rematerialization anchor contract.
 *
 * Pins the canonical shape of `RollingRematerializationWindow` so callers
 * (cron handler + remediation control plane) consume the same primitive
 * instead of duplicating date math.
 *
 * The math itself is exactly ISSUE-069's: `seedDate = today − (lookbackDays
 * + 1)`. The novelty is the tipado shape with explicit
 * `targetStartDate / materializeStartDate / materializeEndDate / lookbackDays
 * / policy` so no consumer can confuse seed-vs-target.
 */
describe('computeRollingRematerializationWindow — TASK-871', () => {
  it('returns the canonical 6-field shape', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    expect(window).toEqual({
      targetStartDate: '2026-05-06',
      seedDate: '2026-05-05',
      materializeStartDate: '2026-05-06',
      materializeEndDate: '2026-05-13',
      lookbackDays: 7,
      policy: 'rolling_window_repair'
    })
  })

  it('guarantees materializeStartDate === targetStartDate (first observed day IS materialized)', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    // El invariante canónico: el primer día observed SIEMPRE se materializa,
    // jamás queda como ancla muda. seedDate vive 1 día antes para preservar
    // el contrato inviolable de rematerializeAccountBalanceRange.
    expect(window.materializeStartDate).toBe(window.targetStartDate)
  })

  it('guarantees seedDate === materializeStartDate - 1d (seed is always one day before window)', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    const seedPlusOne = new Date(`${window.seedDate}T00:00:00.000Z`)

    seedPlusOne.setUTCDate(seedPlusOne.getUTCDate() + 1)

    expect(seedPlusOne.toISOString().slice(0, 10)).toBe(window.materializeStartDate)
  })

  it('materializeEndDate equals today inclusive', () => {
    const today = new Date('2026-05-13T15:42:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    expect(window.materializeEndDate).toBe('2026-05-13')
  })

  it('reproduces ISSUE-069 boundary case (today=2026-05-08, lookback=7)', () => {
    const today = new Date('2026-05-08T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    // ISSUE-069 fix lived as the seed math; TASK-871 exposes the rest of the window.
    expect(window.seedDate).toBe('2026-04-30')
    expect(window.targetStartDate).toBe('2026-05-01')
    expect(window.materializeStartDate).toBe('2026-05-01')
    expect(window.materializeEndDate).toBe('2026-05-08')
  })

  it('handles lookbackDays=1 (minimal viable rolling window)', () => {
    const today = new Date('2026-05-08T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 1)

    expect(window.seedDate).toBe('2026-05-06')
    expect(window.targetStartDate).toBe('2026-05-07')
    expect(window.materializeStartDate).toBe('2026-05-07')
    expect(window.materializeEndDate).toBe('2026-05-08')
    expect(window.lookbackDays).toBe(1)
  })

  it('handles lookbackDays=30 (extended audit window)', () => {
    const today = new Date('2026-05-08T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 30)

    expect(window.seedDate).toBe('2026-04-07')
    expect(window.targetStartDate).toBe('2026-04-08')
    expect(window.materializeStartDate).toBe('2026-04-08')
    expect(window.materializeEndDate).toBe('2026-05-08')
  })

  it('crosses month boundary correctly (today=2026-05-03, lookback=7)', () => {
    const today = new Date('2026-05-03T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    expect(window.seedDate).toBe('2026-04-25')
    expect(window.targetStartDate).toBe('2026-04-26')
    expect(window.materializeEndDate).toBe('2026-05-03')
  })

  it('crosses year boundary correctly (today=2026-01-05, lookback=7)', () => {
    const today = new Date('2026-01-05T00:00:00.000Z')

    const window = computeRollingRematerializationWindow(today, 7)

    expect(window.seedDate).toBe('2025-12-28')
    expect(window.targetStartDate).toBe('2025-12-29')
    expect(window.materializeEndDate).toBe('2026-01-05')
  })

  it('always tags the canonical policy label', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    expect(computeRollingRematerializationWindow(today, 1).policy).toBe('rolling_window_repair')
    expect(computeRollingRematerializationWindow(today, 7).policy).toBe('rolling_window_repair')
    expect(computeRollingRematerializationWindow(today, 30).policy).toBe('rolling_window_repair')
  })

  it('throws on lookbackDays < 1 (invalid rolling window)', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    expect(() => computeRollingRematerializationWindow(today, 0)).toThrow(/lookbackDays must be >= 1/)
    expect(() => computeRollingRematerializationWindow(today, -7)).toThrow(/lookbackDays must be >= 1/)
  })

  it('throws on non-finite lookbackDays (defensive against NaN from env parse)', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    expect(() => computeRollingRematerializationWindow(today, NaN)).toThrow(/lookbackDays must be >= 1/)
    expect(() => computeRollingRematerializationWindow(today, Infinity)).toThrow(/lookbackDays must be >= 1/)
  })

  it('legacy computeRematerializeSeedDate matches window.seedDate exactly (back-compat invariant)', () => {
    const today = new Date('2026-05-13T00:00:00.000Z')

    for (const lookback of [1, 3, 7, 14, 30]) {
      const window = computeRollingRematerializationWindow(today, lookback)
      const legacy = computeRematerializeSeedDate(today, lookback)

      expect(legacy).toBe(window.seedDate)
    }
  })
})
