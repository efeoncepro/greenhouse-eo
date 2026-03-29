import { describe, expect, it } from 'vitest'

import * as economicIndicators from '@/lib/finance/economic-indicators'

describe('economic indicator conversions', () => {
  it('converts UF to CLP and back using pure helpers', () => {
    expect(economicIndicators.convertUfToClpValue({ amountUf: 3, ufValue: 39841.72 })).toBe(119525.16)
    expect(economicIndicators.convertClpToUfValue({ amountClp: 119525.16, ufValue: 39841.72 })).toBe(3)
  })

  it('converts UTM to CLP and back using pure helpers', () => {
    expect(economicIndicators.convertUtmToClpValue({ amountUtm: 2, utmValue: 69889 })).toBe(139778)
    expect(economicIndicators.convertClpToUtmValue({ amountClp: 139778, utmValue: 69889 })).toBe(2)
  })

  it('ignores missing BigQuery indicator table errors', () => {
    expect(
      economicIndicators.shouldIgnoreEconomicIndicatorsBigQueryError(
        new Error('Not found: Table efeonce-group:greenhouse.fin_economic_indicators was not found in location US')
      )
    ).toBe(true)
  })

  it('does not ignore unrelated BigQuery errors', () => {
    expect(
      economicIndicators.shouldIgnoreEconomicIndicatorsBigQueryError(
        new Error('Access Denied: BigQuery BigQuery: Permission denied while getting Drive credentials.')
      )
    ).toBe(false)
  })

  it('picks the latest useful snapshot from a mindicador series', () => {
    expect(
      economicIndicators.pickLatestMindicadorSnapshot('IPC', [
        { fecha: '2025-10-01T03:00:00.000Z', valor: 0 },
        { fecha: '2025-12-01T03:00:00.000Z', valor: -0.2 },
        { fecha: '2025-11-01T03:00:00.000Z', valor: 0.3 }
      ])
    ).toMatchObject({
      indicatorCode: 'IPC',
      indicatorDate: '2025-12-01',
      value: -0.2
    })
  })

  it('does not throw when syncing IMM (manual-only indicator)', async () => {
    const result = await economicIndicators.syncEconomicIndicator({ indicatorCode: 'IMM' })

    expect(result.indicatorCode).toBe('IMM')
    expect(result.synced).toBe(false)
    expect(result.snapshot).toBeNull()
  })
})
