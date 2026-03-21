import { describe, expect, it } from 'vitest'

import {
  getCompensationSaveMode,
  getCompensationVersionLockedMessage,
  isCompensationVersionLockedByPayroll
} from './compensation-versioning'

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

  it('allows updating when payroll usage is only in recalculable periods', () => {
    expect(isCompensationVersionLockedByPayroll(['calculated', 'draft'])).toBe(false)
  })

  it('keeps approved periods editable until payroll is exported', () => {
    expect(isCompensationVersionLockedByPayroll(['calculated', 'approved'])).toBe(false)
  })

  it('locks updating when payroll usage already reached an exported period', () => {
    expect(isCompensationVersionLockedByPayroll(['exported'])).toBe(true)
  })

  it('documents the locked message shown when the version is already frozen by payroll', () => {
    expect(getCompensationVersionLockedMessage()).toContain('exported payroll period')
  })
})
