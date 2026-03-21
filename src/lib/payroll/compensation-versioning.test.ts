import { describe, expect, it } from 'vitest'

import { getCompensationSaveMode } from './compensation-versioning'

describe('getCompensationSaveMode', () => {
  it('updates the existing version when the effective date is unchanged', () => {
    expect(
      getCompensationSaveMode({
        existingVersion: {
          effectiveFrom: '2026-03-01'
        } as any,
        effectiveFrom: '2026-03-01'
      })
    ).toBe('update')
  })

  it('creates a new version when the effective date changes', () => {
    expect(
      getCompensationSaveMode({
        existingVersion: {
          effectiveFrom: '2026-03-01'
        } as any,
        effectiveFrom: '2026-04-01'
      })
    ).toBe('create')
  })

  it('creates a version when there is no existing compensation', () => {
    expect(
      getCompensationSaveMode({
        existingVersion: null,
        effectiveFrom: '2026-03-01'
      })
    ).toBe('create')
  })
})
