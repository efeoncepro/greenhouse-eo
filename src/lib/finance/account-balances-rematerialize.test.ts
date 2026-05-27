import { describe, expect, it } from 'vitest'

import { applyGenesisFloor } from './account-balances-rematerialize'

describe('applyGenesisFloor (TASK-938 genesis floor)', () => {
  const otb = { genesisDate: '2026-04-05', openingBalance: 8562 }

  it('clamps seed up to genesis + OTB opening when seed < genesis (the regression case)', () => {
    const out = applyGenesisFloor({ seedDate: '2026-03-06', openingBalance: 999, activeOtb: otb })

    expect(out.seedDate).toBe('2026-04-05')
    expect(out.openingBalance).toBe(8562)
    expect(out.genesisFloorApplied).toEqual({ requestedSeed: '2026-03-06', otbGenesis: '2026-04-05' })
  })

  it('does NOT clamp when seed === genesis (active_otb normal case)', () => {
    const out = applyGenesisFloor({ seedDate: '2026-04-05', openingBalance: 8562, activeOtb: otb })

    expect(out.seedDate).toBe('2026-04-05')
    expect(out.openingBalance).toBe(8562)
    expect(out.genesisFloorApplied).toBeUndefined()
  })

  it('does NOT clamp when seed > genesis (rolling jobs TASK-871 — recent window)', () => {
    const out = applyGenesisFloor({ seedDate: '2026-05-19', openingBalance: 12345, activeOtb: otb })

    expect(out.seedDate).toBe('2026-05-19')
    expect(out.openingBalance).toBe(12345)
    expect(out.genesisFloorApplied).toBeUndefined()
  })

  it('does NOT clamp when there is no active OTB', () => {
    const out = applyGenesisFloor({ seedDate: '2026-01-01', openingBalance: 0, activeOtb: null })

    expect(out.seedDate).toBe('2026-01-01')
    expect(out.openingBalance).toBe(0)
    expect(out.genesisFloorApplied).toBeUndefined()
  })

  it('uses lexicographic YYYY-MM-DD comparison correctly across month/year boundaries', () => {
    // 2025-12-31 < 2026-04-05 → clamp
    const crossYear = applyGenesisFloor({ seedDate: '2025-12-31', openingBalance: 1, activeOtb: otb })

    expect(crossYear.genesisFloorApplied?.requestedSeed).toBe('2025-12-31')
    expect(crossYear.seedDate).toBe('2026-04-05')

    // 2026-04-04 < 2026-04-05 → clamp (one day before genesis, the exact bug date)
    const oneDayBefore = applyGenesisFloor({ seedDate: '2026-04-04', openingBalance: 1, activeOtb: otb })

    expect(oneDayBefore.seedDate).toBe('2026-04-05')
  })
})
