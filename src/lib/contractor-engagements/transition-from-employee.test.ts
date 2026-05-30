import { describe, expect, it } from 'vitest'

import { mapRelationshipSubtypeToEngagementSubtype } from './transition-from-employee'

describe('mapRelationshipSubtypeToEngagementSubtype (TASK-956 Slice 1)', () => {
  it('maps honorarios → honorarios_cl regardless of country', () => {
    expect(mapRelationshipSubtypeToEngagementSubtype('honorarios', 'CL')).toBe('honorarios_cl')
    expect(mapRelationshipSubtypeToEngagementSubtype('honorarios', 'US')).toBe('honorarios_cl')
    expect(mapRelationshipSubtypeToEngagementSubtype('honorarios', null)).toBe('honorarios_cl')
  })

  it('maps contractor + CL → freelance', () => {
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', 'CL')).toBe('freelance')
  })

  it('normalizes country casing/whitespace before the CL check', () => {
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', ' cl ')).toBe('freelance')
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', 'cl')).toBe('freelance')
  })

  it('maps contractor + non-CL → international_contractor', () => {
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', 'US')).toBe(
      'international_contractor'
    )
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', 'CO')).toBe(
      'international_contractor'
    )
  })

  it('defaults contractor with unknown/empty country to international_contractor (conservative non-CL)', () => {
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', null)).toBe(
      'international_contractor'
    )
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', undefined)).toBe(
      'international_contractor'
    )
    expect(mapRelationshipSubtypeToEngagementSubtype('contractor', '')).toBe(
      'international_contractor'
    )
  })
})

// NOTE: A full DB integration test of `transitionEmployeeToContractorEngagement`
// is intentionally NOT included here. The command's correctness hinges on the
// anchor-visibility behavior of `createContractorEngagement` (the contractor
// relationship must be INSERTed and visible within the SAME transaction before
// `loadActiveContractorAnchor` reads it). Fabricating pg mocks would hide that
// exact behavior and give false confidence. This belongs in a `.live.test.ts`
// exercised against a real Postgres (proxy) — see CLAUDE.md "SQL embebido — type
// alignment + live testing" (ISSUE-071). Deferred to a live harness.
