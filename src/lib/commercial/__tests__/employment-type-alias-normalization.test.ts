import { describe, expect, it } from 'vitest'

import { normalizeEmploymentTypeAliasValue } from '@/lib/commercial/employment-type-alias-normalization'

describe('normalizeEmploymentTypeAliasValue', () => {
  it('normalizes payroll-friendly tokens into canonical lookup keys', () => {
    expect(normalizeEmploymentTypeAliasValue('  Part-Time  ')).toBe('part_time')
    expect(normalizeEmploymentTypeAliasValue('plazo fijo')).toBe('plazo_fijo')
    expect(normalizeEmploymentTypeAliasValue('honorários')).toBe('honorarios')
  })

  it('returns empty string for nullish values', () => {
    expect(normalizeEmploymentTypeAliasValue(undefined)).toBe('')
    expect(normalizeEmploymentTypeAliasValue(null)).toBe('')
    expect(normalizeEmploymentTypeAliasValue('')).toBe('')
  })
})
