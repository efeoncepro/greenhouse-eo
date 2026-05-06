import { describe, expect, it } from 'vitest'

import { buildStatusMap, getMicrocopy } from './index'

describe('microcopy foundation', () => {
  it('returns shared copy for the default locale', () => {
    const copy = getMicrocopy()

    expect(copy.actions.save).toBe('Guardar')
    expect(copy.months.short).toHaveLength(12)
  })

  it('builds status maps from canonical state labels while preserving metadata', () => {
    const statusMap = buildStatusMap({
      draft: { copyKey: 'draft', color: 'secondary' as const },
      approved: { copyKey: 'approved', color: 'success' as const, icon: 'tabler-check' }
    })

    expect(statusMap).toEqual({
      draft: { label: 'Borrador', color: 'secondary' },
      approved: { label: 'Aprobado', color: 'success', icon: 'tabler-check' }
    })
  })
})
