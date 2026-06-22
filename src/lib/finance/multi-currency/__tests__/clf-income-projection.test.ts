import { describe, expect, it, vi } from 'vitest'

import { buildClfIncomeProjection } from '../clf-income-projection'
import type { FxSnapshotEvidence } from '../fx-snapshot'

/**
 * TASK-995 Slice 3 — proyección CLF (UF) → CLP funcional para un income.
 * ADR §6 (reconocimiento con UF de la fecha del evento) + §12 (fail-closed sin UF).
 */
const snapshot = (rate: number): FxSnapshotEvidence => ({
  fromCurrency: 'CLF',
  toCurrency: 'CLP',
  fromUnitClass: 'indexed_unit',
  rate: rate.toFixed(8),
  inverseRate: (1 / rate).toFixed(8),
  rateDate: '2026-06-20',
  rateDateResolved: '2026-06-19',
  source: 'economic_indicators.UF',
  composedVia: null,
  policy: 'rate_at_event',
  lockedBy: 'system',
  manualOverrideReason: null
})

describe('buildClfIncomeProjection (TASK-995)', () => {
  it('proyecta native CLF × UF a CLP funcional (afecto + IVA)', async () => {
    const resolveSnapshot = vi.fn().mockResolvedValue(snapshot(40000))

    const p = await buildClfIncomeProjection(
      { subtotalClf: 100, taxAmountClf: 19, totalClf: 119, rateDate: '2026-06-20' },
      { resolveSnapshot }
    )

    expect(p).not.toBeNull()
    expect(p?.ufRate).toBe(40000)
    expect(p?.functionalSubtotalClp).toBe(4000000) // 100 UF × 40.000
    expect(p?.functionalTaxAmountClp).toBe(760000) // 19 UF × 40.000
    expect(p?.functionalTotalClp).toBe(4760000) // 119 UF × 40.000
    expect(p?.nativeAmountClf).toBe(119)
    expect(p?.fxSnapshotEvidence.fromUnitClass).toBe('indexed_unit')
  })

  it('proyecta una factura CLF exenta (sin IVA)', async () => {
    const resolveSnapshot = vi.fn().mockResolvedValue(snapshot(39500))

    const p = await buildClfIncomeProjection(
      { subtotalClf: 0, taxAmountClf: 0, totalClf: 50, rateDate: '2026-06-20' },
      { resolveSnapshot }
    )

    expect(p?.functionalTotalClp).toBe(1975000) // 50 UF × 39.500
    expect(p?.nativeAmountClf).toBe(50)
  })

  it('redondea el CLP funcional a ENTERO (factura chilena sin centavos)', async () => {
    // UF realista con decimales → native × UF da un valor no-entero que debe
    // redondearse a entero CLP, no quedar con centavos.
    const resolveSnapshot = vi.fn().mockResolvedValue(snapshot(39383.07))

    const p = await buildClfIncomeProjection(
      { subtotalClf: 0, taxAmountClf: 0, totalClf: 117.27, rateDate: '2026-06-20' },
      { resolveSnapshot }
    )

    // 117.27 × 39383.07 = 4.618.948,17... → entero
    expect(p?.functionalTotalClp).toBe(Math.round(117.27 * 39383.07))
    expect(Number.isInteger(p?.functionalTotalClp)).toBe(true)
    expect(p?.nativeAmountClf).toBe(117.27) // el native UF conserva decimales
  })

  it('fail-closed: sin valor UF → null (el caller bloquea el write)', async () => {
    const resolveSnapshot = vi.fn().mockResolvedValue(null)

    const p = await buildClfIncomeProjection(
      { subtotalClf: 100, taxAmountClf: 19, totalClf: 119, rateDate: '2026-06-20' },
      { resolveSnapshot }
    )

    expect(p).toBeNull()
  })
})
