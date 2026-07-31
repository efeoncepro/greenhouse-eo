import { describe, expect, it } from 'vitest'

import { resolveAdjustmentRecalculationScope } from './recalculate-adjustment'

describe('resolveAdjustmentRecalculationScope', () => {
  it('uses period calculation when participation windows are enabled', () => {
    expect(
      resolveAdjustmentRecalculationScope({
        participationWindowEnabled: true
      })
    ).toBe('period')
  })

  it('keeps the lightweight entry path when participation windows are disabled', () => {
    expect(
      resolveAdjustmentRecalculationScope({
        participationWindowEnabled: false
      })
    ).toBe('entry')
  })
})
