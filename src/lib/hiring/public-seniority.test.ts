import { describe, expect, it } from 'vitest'

import {
  assertPublicTitleSeniorityConsistency,
  inferExplicitSeniorityFromPublicTitle,
  parseHiringPublicSeniority
} from './public-seniority'

describe('public seniority contract', () => {
  it.each(['Junior', 'Semi-senior', 'Senior', 'Lead'] as const)('accepts the candidate-facing value %s', value => {
    expect(parseHiringPublicSeniority(value)).toBe(value)
  })

  it.each(['L2', 'Intermedio', 'Semi Senior', 'senior', 'Sr'])(
    'rejects internal, translated or non-canonical value %s',
    value => {
      expect(() => parseHiringPublicSeniority(value)).toThrowError(
        expect.objectContaining({ code: 'hiring_opening_public_seniority_invalid' })
      )
    }
  )

  it('detects the explicit level in a searchable public title', () => {
    expect(inferExplicitSeniorityFromPublicTitle('Senior Visual Designer')).toBe('Senior')
    expect(inferExplicitSeniorityFromPublicTitle('Sr. Visual Designer')).toBe('Senior')
    expect(inferExplicitSeniorityFromPublicTitle('Diseñador/a semi senior')).toBe('Semi-senior')
    expect(inferExplicitSeniorityFromPublicTitle('SEO Specialist')).toBeNull()
  })

  it('blocks a title that says Senior with a different public level', () => {
    expect(() => assertPublicTitleSeniorityConsistency('Senior Visual Designer', 'Semi-senior')).toThrowError(
      expect.objectContaining({ code: 'hiring_opening_public_seniority_title_mismatch' })
    )
    expect(() => assertPublicTitleSeniorityConsistency('Senior Visual Designer', 'Senior')).not.toThrow()
  })
})
