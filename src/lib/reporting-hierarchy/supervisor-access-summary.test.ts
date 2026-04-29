import { describe, expect, it } from 'vitest'

import { toSupervisorAccessSummary } from '@/lib/reporting-hierarchy/types'
import type { SupervisorScopeRecord } from '@/lib/reporting-hierarchy/types'

/**
 * TASK-727: SupervisorAccessSummary derivation
 *
 * Verifica que `toSupervisorAccessSummary` produce un payload JWT-safe (sin arrays variables)
 * que conserva los flags canónicos de autoridad de supervisor.
 */

const buildScope = (overrides: Partial<SupervisorScopeRecord> = {}): SupervisorScopeRecord => ({
  memberId: 'daniela-ferreira',
  directReportCount: 3,
  delegatedSupervisorIds: [],
  visibleMemberIds: ['daniela-ferreira', 'andres-carlosama', 'melkin-hernandez', 'valentina-hoyos'],
  hasDirectReports: true,
  hasDelegatedAuthority: false,
  canAccessSupervisorPeople: true,
  canAccessSupervisorLeave: true,
  ...overrides
})

describe('TASK-727: toSupervisorAccessSummary', () => {
  it('produces summary with canAccessSupervisorLeave for Daniela case (3 direct reports)', () => {
    const summary = toSupervisorAccessSummary(buildScope())

    expect(summary.canAccessSupervisorLeave).toBe(true)
    expect(summary.canAccessSupervisorPeople).toBe(true)
    expect(summary.directReportCount).toBe(3)
    expect(summary.memberId).toBe('daniela-ferreira')
  })

  it('does NOT include visibleMemberIds (JWT-safe — array variable se resuelve server-side)', () => {
    const summary = toSupervisorAccessSummary(buildScope())

    expect(summary).not.toHaveProperty('visibleMemberIds')
  })

  it('does NOT include delegatedSupervisorIds (JWT-safe)', () => {
    const summary = toSupervisorAccessSummary(buildScope())

    expect(summary).not.toHaveProperty('delegatedSupervisorIds')
  })

  it('exposes delegatedSupervisorCount derived from delegatedSupervisorIds.length', () => {
    const summary = toSupervisorAccessSummary(buildScope({
      delegatedSupervisorIds: ['m1', 'm2']
    }))

    expect(summary.delegatedSupervisorCount).toBe(2)
  })

  it('hasDelegatedAuthority derives from scope', () => {
    const withDelegate = toSupervisorAccessSummary(buildScope({
      hasDelegatedAuthority: true,
      delegatedSupervisorIds: ['boss-1']
    }))

    expect(withDelegate.hasDelegatedAuthority).toBe(true)
    expect(withDelegate.delegatedSupervisorCount).toBe(1)
  })

  it('non-supervisor scope produces summary with all access flags false', () => {
    const summary = toSupervisorAccessSummary(buildScope({
      hasDirectReports: false,
      hasDelegatedAuthority: false,
      directReportCount: 0,
      canAccessSupervisorPeople: false,
      canAccessSupervisorLeave: false,
      delegatedSupervisorIds: []
    }))

    expect(summary.canAccessSupervisorLeave).toBe(false)
    expect(summary.canAccessSupervisorPeople).toBe(false)
    expect(summary.hasDirectReports).toBe(false)
    expect(summary.hasDelegatedAuthority).toBe(false)
    expect(summary.directReportCount).toBe(0)
    expect(summary.delegatedSupervisorCount).toBe(0)
  })

  it('null memberId scope produces null memberId in summary (no member resolved)', () => {
    const summary = toSupervisorAccessSummary(buildScope({
      memberId: null,
      hasDirectReports: false,
      canAccessSupervisorLeave: false,
      canAccessSupervisorPeople: false,
      directReportCount: 0,
      visibleMemberIds: []
    }))

    expect(summary.memberId).toBeNull()
  })

  it('summary has stable shape for JWT serialization (only 7 known fields)', () => {
    const summary = toSupervisorAccessSummary(buildScope())
    const keys = Object.keys(summary).sort()

    expect(keys).toEqual([
      'canAccessSupervisorLeave',
      'canAccessSupervisorPeople',
      'delegatedSupervisorCount',
      'directReportCount',
      'hasDelegatedAuthority',
      'hasDirectReports',
      'memberId'
    ])
  })
})
