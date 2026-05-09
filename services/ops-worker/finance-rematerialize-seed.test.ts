import { describe, expect, it } from 'vitest'

import { computeRematerializeSeedDate } from './finance-rematerialize-seed'

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
