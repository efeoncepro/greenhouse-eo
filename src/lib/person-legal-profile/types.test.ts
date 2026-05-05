import { describe, it, expect } from 'vitest'

import {
  PERSON_DOCUMENT_TYPES,
  VERIFICATION_STATUSES,
  PERSON_LEGAL_SOURCES,
  ADDRESS_TYPES,
  isPersonDocumentType
} from './types'

describe('TASK-784 types canon', () => {
  it('PERSON_DOCUMENT_TYPES covers Chile RUT + extensible internacional', () => {
    expect(PERSON_DOCUMENT_TYPES).toContain('CL_RUT')
    expect(PERSON_DOCUMENT_TYPES).toContain('AR_DNI')
    expect(PERSON_DOCUMENT_TYPES).toContain('GENERIC_NATIONAL_ID')
  })

  it('VERIFICATION_STATUSES matches CHECK constraint canonico', () => {
    expect([...VERIFICATION_STATUSES].sort()).toEqual(
      ['archived', 'expired', 'pending_review', 'rejected', 'verified'].sort()
    )
  })

  it('PERSON_LEGAL_SOURCES matches CHECK constraint canonico', () => {
    expect([...PERSON_LEGAL_SOURCES].sort()).toEqual(
      [
        'automated_provider',
        'hr_declared',
        'legacy_bigquery_member_profile',
        'migration',
        'self_declared'
      ].sort()
    )
  })

  it('ADDRESS_TYPES matches CHECK constraint canonico', () => {
    expect([...ADDRESS_TYPES].sort()).toEqual(['emergency', 'legal', 'mailing', 'residence'].sort())
  })

  it('isPersonDocumentType returns true for canonical members', () => {
    expect(isPersonDocumentType('CL_RUT')).toBe(true)
    expect(isPersonDocumentType('GENERIC_TAX_ID')).toBe(true)
  })

  it('isPersonDocumentType rejects unknowns and non-strings', () => {
    expect(isPersonDocumentType('XX_BOGUS')).toBe(false)
    expect(isPersonDocumentType(null)).toBe(false)
    expect(isPersonDocumentType(123)).toBe(false)
  })
})
