import { describe, expect, it } from 'vitest'

import {
  ContractorSubtypeConsistencyError,
  assertSubtypeConsistency,
  isSubtypeConsistent,
  normalizeRelationshipCoarseSubtype
} from './subtype-consistency'

describe('contractor subtype family consistency (D2)', () => {
  it('normalizes only the two coarse relationship subtypes', () => {
    expect(normalizeRelationshipCoarseSubtype('honorarios')).toBe('honorarios')
    expect(normalizeRelationshipCoarseSubtype('contractor')).toBe('contractor')
    expect(normalizeRelationshipCoarseSubtype('honorarios_cl')).toBeNull()
    expect(normalizeRelationshipCoarseSubtype(undefined)).toBeNull()
    expect(normalizeRelationshipCoarseSubtype(42)).toBeNull()
  })

  it('honorarios coarse only accepts honorarios_cl', () => {
    expect(isSubtypeConsistent('honorarios', 'honorarios_cl')).toBe(true)
    expect(isSubtypeConsistent('honorarios', 'freelance')).toBe(false)
    expect(isSubtypeConsistent('honorarios', 'international_contractor')).toBe(false)
  })

  it('contractor coarse accepts the international/freelance family, not honorarios_cl', () => {
    expect(isSubtypeConsistent('contractor', 'freelance')).toBe(true)
    expect(isSubtypeConsistent('contractor', 'independent_professional')).toBe(true)
    expect(isSubtypeConsistent('contractor', 'international_contractor')).toBe(true)
    expect(isSubtypeConsistent('contractor', 'provider_platform')).toBe(true)
    expect(isSubtypeConsistent('contractor', 'honorarios_cl')).toBe(false)
  })

  it('assertSubtypeConsistency throws on cross-family drift', () => {
    expect(() => assertSubtypeConsistency('honorarios', 'freelance')).toThrow(
      ContractorSubtypeConsistencyError
    )
    expect(() => assertSubtypeConsistency('contractor', 'honorarios_cl')).toThrow(
      ContractorSubtypeConsistencyError
    )
  })

  it('does not block when the coarse subtype is unknown (legacy metadata, honest degradation)', () => {
    expect(() => assertSubtypeConsistency(null, 'freelance')).not.toThrow()
    expect(() => assertSubtypeConsistency(null, 'honorarios_cl')).not.toThrow()
  })

  it('does not throw for consistent pairs', () => {
    expect(() => assertSubtypeConsistency('honorarios', 'honorarios_cl')).not.toThrow()
    expect(() => assertSubtypeConsistency('contractor', 'international_contractor')).not.toThrow()
  })
})
