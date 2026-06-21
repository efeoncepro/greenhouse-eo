import { describe, expect, it, vi } from 'vitest'

import { resolveIndexedUnitSnapshotEvidence } from '../fx-snapshot'

/**
 * TASK-995 Slice 3 — indexed-unit (CLF→CLP) snapshot evidence resolver.
 * ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1 §7 (Option A). The UF rate is
 * sourced from economic_indicators.UF via the clf_from_indicators adapter (never
 * exchange_rates), and the evidence is marked `indexed_unit`. Fail-closed: no UF
 * value → null (caller blocks the write).
 */
describe('resolveIndexedUnitSnapshotEvidence (TASK-995)', () => {
  it('builds an indexed_unit CLF→CLP snapshot from the UF rate', async () => {
    const fetchRate = vi.fn().mockResolvedValue({
      fromCurrency: 'CLF',
      toCurrency: 'CLP',
      rate: 39383.07,
      rateDate: '2026-06-19',
      requestedDate: '2026-06-20',
      isCarried: true,
      source: 'clf_from_indicators',
      publishedAt: null
    })

    const evidence = await resolveIndexedUnitSnapshotEvidence(
      { unit: 'CLF', rateDate: '2026-06-20' },
      { fetchRate }
    )

    expect(evidence).not.toBeNull()
    expect(evidence?.fromCurrency).toBe('CLF')
    expect(evidence?.toCurrency).toBe('CLP')
    expect(evidence?.fromUnitClass).toBe('indexed_unit')
    expect(evidence?.source).toBe('economic_indicators.UF')
    expect(Number(evidence?.rate)).toBeCloseTo(39383.07, 2)
    expect(evidence?.rateDate).toBe('2026-06-20')
    expect(evidence?.rateDateResolved).toBe('2026-06-19')
    expect(evidence?.policy).toBe('rate_at_event')
    expect(evidence?.lockedBy).toBe('system')
  })

  it('fails closed when no UF value exists (returns null)', async () => {
    const fetchRate = vi.fn().mockResolvedValue(null)

    const evidence = await resolveIndexedUnitSnapshotEvidence(
      { unit: 'CLF', rateDate: '2026-06-20' },
      { fetchRate }
    )

    expect(evidence).toBeNull()
  })

  it('rejects a non-CLF indexed unit (defensive — only CLF supported in V1)', async () => {
    const fetchRate = vi.fn()

    const evidence = await resolveIndexedUnitSnapshotEvidence(
      // @ts-expect-error V1 only supports CLF as an indexed unit
      { unit: 'UTM', rateDate: '2026-06-20' },
      { fetchRate }
    )

    expect(evidence).toBeNull()
    expect(fetchRate).not.toHaveBeenCalled()
  })

  it('honors an explicit policy override (rate_at_settlement)', async () => {
    const fetchRate = vi.fn().mockResolvedValue({
      fromCurrency: 'CLF',
      toCurrency: 'CLP',
      rate: 40000,
      rateDate: '2026-07-01',
      requestedDate: '2026-07-01',
      isCarried: false,
      source: 'clf_from_indicators',
      publishedAt: null
    })

    const evidence = await resolveIndexedUnitSnapshotEvidence(
      { unit: 'CLF', rateDate: '2026-07-01', policy: 'rate_at_settlement' },
      { fetchRate }
    )

    expect(evidence?.policy).toBe('rate_at_settlement')
  })
})
