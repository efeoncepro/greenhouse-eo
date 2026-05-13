/**
 * TASK-826 Slice 1 — Unit tests for ClientPortalValidationError + asserts.
 */

import { describe, expect, it } from 'vitest'

import {
  assertIsoDate,
  assertIsoTimestamp,
  assertNonEmptyString,
  assertReason20Plus,
  assertValidAssignmentSource,
  assertValidAssignmentStatus,
  BusinessLineMismatchError,
  ClientPortalValidationError
} from '../errors'

describe('ClientPortalValidationError + asserts', () => {
  it('ClientPortalValidationError carries statusCode + details', () => {
    const err = new ClientPortalValidationError('bad input', 400, { field: 'foo' })

    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ClientPortalValidationError')
    expect(err.message).toBe('bad input')
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ field: 'foo' })
  })

  it('BusinessLineMismatchError extends ClientPortalValidationError con statusCode=403', () => {
    const err = new BusinessLineMismatchError('mismatch', { applicabilityScope: 'globe' })

    expect(err).toBeInstanceOf(ClientPortalValidationError)
    expect(err.name).toBe('BusinessLineMismatchError')
    expect(err.statusCode).toBe(403)
    expect(err.details).toEqual({ applicabilityScope: 'globe' })
  })

  describe('assertNonEmptyString', () => {
    it('returns trimmed string when valid', () => {
      expect(assertNonEmptyString('  hello  ', 'name')).toBe('hello')
    })

    it('throws when undefined', () => {
      expect(() => assertNonEmptyString(undefined, 'name')).toThrow('name must be a string')
    })

    it('throws when empty after trim', () => {
      expect(() => assertNonEmptyString('   ', 'name')).toThrow('name is required')
    })

    it('throws when not a string', () => {
      expect(() => assertNonEmptyString(123, 'name')).toThrow('name must be a string')
    })
  })

  describe('assertReason20Plus', () => {
    it('returns string when 20+ chars', () => {
      const reason = 'override approved for revenue leak risk assessment'

      expect(assertReason20Plus(reason, 'overrideReason')).toBe(reason)
    })

    it('throws when shorter than 20', () => {
      expect(() => assertReason20Plus('short reason', 'overrideReason')).toThrow(/at least 20/)
    })

    it('throws when undefined', () => {
      expect(() => assertReason20Plus(undefined, 'overrideReason')).toThrow('overrideReason must be a string')
    })

    it('uses trimmed length for the 20 char check', () => {
      // 19 visible chars + leading/trailing spaces = 23 raw but 19 trimmed
      expect(() => assertReason20Plus('   nineteen chars OK   ', 'overrideReason')).toThrow(/at least 20/)
    })
  })

  describe('assertValidAssignmentStatus', () => {
    it.each(['active', 'pilot', 'pending'] as const)('accepts %s', status => {
      expect(assertValidAssignmentStatus(status)).toBe(status)
    })

    it('rejects unknown status', () => {
      expect(() => assertValidAssignmentStatus('paused')).toThrow(/active, pilot, pending/)
      expect(() => assertValidAssignmentStatus(undefined)).toThrow()
    })
  })

  describe('assertValidAssignmentSource', () => {
    it('accepts all 6 canonical sources', () => {
      const sources = [
        'lifecycle_case_provision',
        'commercial_terms_cascade',
        'manual_admin',
        'self_service_request',
        'migration_backfill',
        'default_business_line'
      ] as const

      for (const source of sources) {
        expect(assertValidAssignmentSource(source)).toBe(source)
      }
    })

    it('rejects unknown source', () => {
      expect(() => assertValidAssignmentSource('hacker_input')).toThrow()
    })
  })

  describe('assertIsoDate', () => {
    it('accepts YYYY-MM-DD', () => {
      expect(assertIsoDate('2026-05-12', 'effectiveFrom')).toBe('2026-05-12')
    })

    it('rejects non-ISO', () => {
      expect(() => assertIsoDate('12/05/2026', 'effectiveFrom')).toThrow(/YYYY-MM-DD/)
    })

    it('rejects with time component (use assertIsoTimestamp)', () => {
      expect(() => assertIsoDate('2026-05-12T10:00:00Z', 'effectiveFrom')).toThrow()
    })
  })

  describe('assertIsoTimestamp', () => {
    it('accepts RFC 3339 with Z', () => {
      expect(assertIsoTimestamp('2026-05-12T10:00:00Z', 'expiresAt')).toBe('2026-05-12T10:00:00Z')
    })

    it('accepts with timezone offset', () => {
      expect(assertIsoTimestamp('2026-05-12T10:00:00-04:00', 'expiresAt')).toBe('2026-05-12T10:00:00-04:00')
    })

    it('accepts with milliseconds', () => {
      expect(assertIsoTimestamp('2026-05-12T10:00:00.123Z', 'expiresAt')).toBe('2026-05-12T10:00:00.123Z')
    })

    it('rejects date-only', () => {
      expect(() => assertIsoTimestamp('2026-05-12', 'expiresAt')).toThrow()
    })
  })
})
