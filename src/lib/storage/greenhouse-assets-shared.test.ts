import { describe, expect, it } from 'vitest'

import { normalizeGreenhouseAssetOwnershipScope, normalizeGreenhouseAssetScopeValue } from './greenhouse-assets-shared'

describe('normalizeGreenhouseAssetScopeValue', () => {
  it('returns null for empty and whitespace-only values', () => {
    expect(normalizeGreenhouseAssetScopeValue('')).toBeNull()
    expect(normalizeGreenhouseAssetScopeValue('   ')).toBeNull()
    expect(normalizeGreenhouseAssetScopeValue(null)).toBeNull()
    expect(normalizeGreenhouseAssetScopeValue(undefined)).toBeNull()
  })

  it('trims non-empty values', () => {
    expect(normalizeGreenhouseAssetScopeValue('  julio-reyes  ')).toBe('julio-reyes')
  })
})

describe('normalizeGreenhouseAssetOwnershipScope', () => {
  it('normalizes empty owner scope values to null', () => {
    expect(
      normalizeGreenhouseAssetOwnershipScope({
        ownerClientId: '',
        ownerSpaceId: '   ',
        ownerMemberId: 'julio-reyes'
      })
    ).toEqual({
      ownerClientId: null,
      ownerSpaceId: null,
      ownerMemberId: 'julio-reyes'
    })
  })
})
