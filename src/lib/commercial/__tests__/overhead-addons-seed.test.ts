import { describe, expect, it } from 'vitest'

import { loadOverheadAddonsSeedFile, normalizeOverheadAddonsCsv } from '@/lib/commercial/overhead-addons-seed'

describe('normalizeOverheadAddonsCsv', () => {
  it('parses percentage, minimum, range, resource-month and adjustment formulas', async () => {
    const csv = await loadOverheadAddonsSeedFile()
    const parsed = normalizeOverheadAddonsCsv(csv)
    const pmFee = parsed.rows.find(row => row.addonSku === 'EFO-003')
    const onboarding = parsed.rows.find(row => row.addonSku === 'EFO-004')
    const renewal = parsed.rows.find(row => row.addonSku === 'EFO-005')
    const aiInfra = parsed.rows.find(row => row.addonSku === 'EFO-007')
    const retention = parsed.rows.find(row => row.addonSku === 'EFO-009')

    expect(pmFee?.addonType).toBe('fee_percentage')
    expect(pmFee?.finalPricePct).toBe(0.1)
    expect(onboarding?.addonType).toBe('resource_month')
    expect(renewal?.addonType).toBe('fee_percentage')
    expect(renewal?.finalPricePct).toBe(0.05)
    expect(aiInfra?.minimumAmountUsd).toBe(30)
    expect(retention?.addonType).toBe('adjustment_pct')
    expect(retention?.finalPricePct).toBe(-0.1)
  })

  it('keeps client visibility and applicability tags aligned with the commercial contract', async () => {
    const csv = await loadOverheadAddonsSeedFile()
    const parsed = normalizeOverheadAddonsCsv(csv)
    const baseOverhead = parsed.rows.find(row => row.addonSku === 'EFO-008')

    expect(baseOverhead?.visibleToClient).toBe(false)
    expect(baseOverhead?.applicableTo).toContain('all_projects')
    expect(parsed.rejectedRows).toHaveLength(0)
  })
})
